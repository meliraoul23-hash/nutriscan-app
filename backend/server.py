from fastapi import FastAPI, APIRouter, HTTPException, Depends, Request, Response
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone, timedelta
import httpx
import bcrypt
import jwt
from emergentintegrations.llm.chat import LlmChat, UserMessage
import stripe

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# ============== PRODUCT CACHE ==============
# Cache pour éviter les appels répétés à Open Food Facts
from functools import lru_cache
from cachetools import TTLCache
import asyncio

# TTL Cache: 300 secondes (5 minutes), max 500 produits
PRODUCT_CACHE = TTLCache(maxsize=500, ttl=300)

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# JWT Secret
JWT_SECRET = os.environ.get('JWT_SECRET', 'nutriscan-secret-key-2024')
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_DAYS = 7

# Emergent LLM Key
EMERGENT_LLM_KEY = os.environ.get('EMERGENT_LLM_KEY', '')

# Stripe Configuration
stripe.api_key = os.environ.get('STRIPE_SECRET_KEY', '')
STRIPE_PUBLIC_KEY = os.environ.get('STRIPE_PUBLIC_KEY', '')

app = FastAPI()
api_router = APIRouter(prefix="/api")
security = HTTPBearer(auto_error=False)

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# ============== ADDITIVES DATABASE ==============
ADDITIVES_DATABASE = {
    'e100': {'name': 'Curcumine', 'risk': 'low', 'description': 'Colorant naturel jaune extrait du curcuma', 'details': 'La curcumine est un pigment naturel présent dans le curcuma. Elle possède des propriétés antioxydantes et anti-inflammatoires. Considérée comme sûre par les autorités sanitaires.', 'sources': ['EFSA', 'FDA'], 'daily_limit': '3 mg/kg'},
    'e101': {'name': 'Riboflavine (Vitamine B2)', 'risk': 'low', 'description': 'Vitamine B2, colorant jaune naturel', 'details': 'Vitamine essentielle pour le métabolisme énergétique. Utilisée comme colorant alimentaire jaune-orangé. Aucun effet secondaire connu aux doses alimentaires.', 'sources': ['OMS', 'EFSA'], 'daily_limit': 'Aucune limite'},
    'e102': {'name': 'Tartrazine', 'risk': 'medium', 'description': 'Colorant jaune synthétique', 'details': 'Colorant azoïque synthétique. Peut provoquer des réactions allergiques chez les personnes sensibles à l\'aspirine. Associé à l\'hyperactivité chez certains enfants. Interdit dans certains pays.', 'sources': ['EFSA', 'CSPI'], 'daily_limit': '7.5 mg/kg'},
    'e110': {'name': 'Jaune orangé S', 'risk': 'medium', 'description': 'Colorant orange synthétique', 'details': 'Colorant azoïque pouvant causer des réactions allergiques. Études montrant un lien possible avec l\'hyperactivité chez les enfants. Obligatoire d\'indiquer sur l\'étiquette en UE.', 'sources': ['EFSA'], 'daily_limit': '4 mg/kg'},
    'e120': {'name': 'Carmin / Cochenille', 'risk': 'low', 'description': 'Colorant rouge naturel d\'origine animale', 'details': 'Extrait d\'insectes (cochenilles). Peut provoquer des réactions allergiques rares. Non végétarien/végan.', 'sources': ['FDA', 'EFSA'], 'daily_limit': '5 mg/kg'},
    'e129': {'name': 'Rouge allura AC', 'risk': 'medium', 'description': 'Colorant rouge synthétique', 'details': 'Colorant azoïque. Études suggérant un lien avec l\'hyperactivité chez les enfants. Interdit dans plusieurs pays européens.', 'sources': ['CSPI', 'EFSA'], 'daily_limit': '7 mg/kg'},
    'e133': {'name': 'Bleu brillant FCF', 'risk': 'low', 'description': 'Colorant bleu synthétique', 'details': 'Colorant synthétique utilisé dans les confiseries et boissons. Faiblement absorbé par l\'organisme. Considéré comme sûr aux doses autorisées.', 'sources': ['EFSA'], 'daily_limit': '6 mg/kg'},
    'e150d': {'name': 'Caramel au sulfite d\'ammonium', 'risk': 'medium', 'description': 'Colorant caramel synthétique', 'details': 'Contient du 4-MEI (4-méthylimidazole), classé cancérogène possible par le CIRC. Présent dans de nombreuses boissons gazeuses. La Californie exige un avertissement.', 'sources': ['CIRC', 'CSPI'], 'daily_limit': '300 mg/kg'},
    'e171': {'name': 'Dioxyde de titane', 'risk': 'high', 'description': 'Colorant blanc, nanoparticules', 'details': 'INTERDIT EN FRANCE depuis 2020. Nanoparticules pouvant traverser la barrière intestinale. Études montrant des effets génotoxiques possibles. L\'EFSA ne le considère plus comme sûr.', 'sources': ['ANSES', 'EFSA 2021'], 'daily_limit': 'Interdit en UE'},
    'e200': {'name': 'Acide sorbique', 'risk': 'low', 'description': 'Conservateur naturel', 'details': 'Conservateur naturellement présent dans certains fruits. Très bien toléré. Efficace contre les moisissures et levures.', 'sources': ['EFSA'], 'daily_limit': '25 mg/kg'},
    'e211': {'name': 'Benzoate de sodium', 'risk': 'medium', 'description': 'Conservateur synthétique', 'details': 'Peut former du benzène (cancérogène) en présence de vitamine C. Peut provoquer de l\'urticaire et de l\'asthme chez les personnes sensibles.', 'sources': ['FDA', 'EFSA'], 'daily_limit': '5 mg/kg'},
    'e220': {'name': 'Dioxyde de soufre', 'risk': 'medium', 'description': 'Conservateur, antioxydant', 'details': 'Peut provoquer des crises d\'asthme chez les personnes sensibles. Détruit la vitamine B1. Obligatoire de le déclarer car allergène.', 'sources': ['EFSA'], 'daily_limit': '0.7 mg/kg'},
    'e250': {'name': 'Nitrite de sodium', 'risk': 'high', 'description': 'Conservateur pour charcuteries', 'details': 'RISQUE ÉLEVÉ: Forme des nitrosamines cancérogènes lors de la cuisson à haute température. L\'ANSES recommande de réduire l\'exposition. Utilisé dans les charcuteries pour la couleur rose et contre le botulisme.', 'sources': ['CIRC', 'ANSES', 'OMS'], 'daily_limit': '0.06 mg/kg'},
    'e251': {'name': 'Nitrate de sodium', 'risk': 'high', 'description': 'Conservateur', 'details': 'Se transforme en nitrites dans l\'organisme. Mêmes risques que E250. Associé au cancer colorectal selon l\'OMS.', 'sources': ['CIRC', 'OMS'], 'daily_limit': '3.7 mg/kg'},
    'e252': {'name': 'Nitrate de potassium', 'risk': 'high', 'description': 'Conservateur (salpêtre)', 'details': 'Mêmes risques que les autres nitrates. Conversion en nitrites cancérogènes. À éviter autant que possible.', 'sources': ['CIRC'], 'daily_limit': '3.7 mg/kg'},
    'e300': {'name': 'Acide ascorbique (Vitamine C)', 'risk': 'low', 'description': 'Antioxydant naturel', 'details': 'Vitamine C naturelle ou synthétique. Excellente pour la santé. Aucun risque aux doses alimentaires.', 'sources': ['OMS', 'EFSA'], 'daily_limit': 'Aucune limite'},
    'e306': {'name': 'Tocophérols (Vitamine E)', 'risk': 'low', 'description': 'Antioxydant naturel', 'details': 'Vitamine E naturelle. Protège contre l\'oxydation. Bénéfique pour la santé cardiovasculaire.', 'sources': ['EFSA'], 'daily_limit': 'Aucune limite'},
    'e320': {'name': 'BHA (Butylhydroxyanisole)', 'risk': 'high', 'description': 'Antioxydant synthétique', 'details': 'RISQUE ÉLEVÉ: Classé cancérogène possible par le CIRC. Perturbateur endocrinien suspecté. Interdit dans les aliments pour bébés en UE.', 'sources': ['CIRC', 'EFSA'], 'daily_limit': '0.5 mg/kg'},
    'e321': {'name': 'BHT (Butylhydroxytoluène)', 'risk': 'medium', 'description': 'Antioxydant synthétique', 'details': 'Controversé. Certaines études suggèrent des effets sur le foie et la thyroïde. Interdit dans plusieurs pays.', 'sources': ['EFSA'], 'daily_limit': '0.25 mg/kg'},
    'e322': {'name': 'Lécithines', 'risk': 'low', 'description': 'Émulsifiant naturel', 'details': 'Extrait du soja ou des œufs. Naturellement présent dans le corps. Bénéfique pour le cerveau et le foie.', 'sources': ['EFSA'], 'daily_limit': 'Aucune limite'},
    'e330': {'name': 'Acide citrique', 'risk': 'low', 'description': 'Acidifiant naturel', 'details': 'Naturellement présent dans les agrumes. Parfaitement sûr. Peut éroder l\'émail dentaire en grande quantité.', 'sources': ['FDA', 'EFSA'], 'daily_limit': 'Aucune limite'},
    'e407': {'name': 'Carraghénanes', 'risk': 'medium', 'description': 'Épaississant d\'algues', 'details': 'Extrait d\'algues rouges. Controversé: certaines études suggèrent une inflammation intestinale. L\'EFSA le considère sûr mais recommande plus de recherches.', 'sources': ['EFSA', 'IARC'], 'daily_limit': '75 mg/kg'},
    'e420': {'name': 'Sorbitol', 'risk': 'low', 'description': 'Édulcorant, humectant', 'details': 'Polyol naturellement présent dans certains fruits. Effet laxatif à forte dose. Convient aux diabétiques.', 'sources': ['EFSA'], 'daily_limit': 'Effet laxatif > 50g/jour'},
    'e450': {'name': 'Diphosphates', 'risk': 'medium', 'description': 'Émulsifiant, stabilisant', 'details': 'Excès de phosphates lié à des problèmes cardiovasculaires et rénaux. Contribue au déséquilibre calcium/phosphore.', 'sources': ['EFSA'], 'daily_limit': '40 mg/kg'},
    'e451': {'name': 'Triphosphates', 'risk': 'medium', 'description': 'Stabilisant', 'details': 'Mêmes préoccupations que E450. Omniprésent dans l\'alimentation industrielle.', 'sources': ['EFSA'], 'daily_limit': '40 mg/kg'},
    'e466': {'name': 'Carboxyméthylcellulose', 'risk': 'medium', 'description': 'Épaississant synthétique', 'details': 'Études récentes suggèrent un effet néfaste sur le microbiote intestinal. Peut favoriser l\'inflammation.', 'sources': ['Nature 2015'], 'daily_limit': 'Non établie'},
    'e471': {'name': 'Mono et diglycérides', 'risk': 'low', 'description': 'Émulsifiant', 'details': 'Dérivés de graisses. Généralement considérés comme sûrs. Peuvent contenir des acides gras trans.', 'sources': ['EFSA'], 'daily_limit': 'Aucune limite'},
    'e621': {'name': 'Glutamate monosodique (MSG)', 'risk': 'medium', 'description': 'Exhausteur de goût', 'details': 'Peut provoquer le "syndrome du restaurant chinois" chez les personnes sensibles: maux de tête, palpitations. L\'EFSA le considère sûr à la dose de 30mg/kg/jour.', 'sources': ['EFSA', 'FDA'], 'daily_limit': '30 mg/kg'},
    'e631': {'name': 'Inosinate disodique', 'risk': 'low', 'description': 'Exhausteur de goût', 'details': 'Souvent associé au MSG. Déconseillé aux personnes souffrant de goutte (augmente l\'acide urique).', 'sources': ['EFSA'], 'daily_limit': 'Pas de limite spécifique'},
    'e900': {'name': 'Diméthylpolysiloxane', 'risk': 'low', 'description': 'Anti-moussant', 'details': 'Silicone alimentaire utilisé dans les huiles de friture. Non absorbé par l\'organisme. Considéré comme inerte.', 'sources': ['FDA', 'EFSA'], 'daily_limit': '1.5 mg/kg'},
    'e950': {'name': 'Acésulfame K', 'risk': 'medium', 'description': 'Édulcorant intense', 'details': 'Édulcorant artificiel 200x plus sucré que le sucre. Certaines études sur animaux soulèvent des questions sur les effets à long terme.', 'sources': ['EFSA'], 'daily_limit': '9 mg/kg'},
    'e951': {'name': 'Aspartame', 'risk': 'medium', 'description': 'Édulcorant intense', 'details': 'Très controversé. Le CIRC l\'a classé "cancérogène possible" en 2023. Déconseillé aux personnes atteintes de phénylcétonurie. L\'EFSA maintient son autorisation.', 'sources': ['CIRC 2023', 'EFSA'], 'daily_limit': '40 mg/kg'},
    'e952': {'name': 'Cyclamate', 'risk': 'medium', 'description': 'Édulcorant', 'details': 'Interdit aux États-Unis depuis 1969 pour suspicion de cancer. Autorisé en Europe avec limite stricte.', 'sources': ['FDA', 'EFSA'], 'daily_limit': '7 mg/kg'},
    'e954': {'name': 'Saccharine', 'risk': 'medium', 'description': 'Édulcorant le plus ancien', 'details': 'A été classé cancérogène puis déclassé. Arrière-goût métallique. Moins utilisé aujourd\'hui.', 'sources': ['FDA', 'EFSA'], 'daily_limit': '5 mg/kg'},
    'e955': {'name': 'Sucralose', 'risk': 'medium', 'description': 'Édulcorant dérivé du sucre', 'details': 'Études récentes suggèrent des effets sur le microbiote intestinal et la glycémie. Stable à la chaleur.', 'sources': ['EFSA', 'Nature 2022'], 'daily_limit': '15 mg/kg'},
    'e960': {'name': 'Stévia (Glycosides de stéviol)', 'risk': 'low', 'description': 'Édulcorant naturel', 'details': 'Extrait d\'une plante sud-américaine. Alternative naturelle aux édulcorants synthétiques. Bien toléré.', 'sources': ['EFSA', 'OMS'], 'daily_limit': '4 mg/kg'},
}

# ============== MODELS ==============
class UserCreate(BaseModel):
    email: str
    password: str
    name: str

class UserLogin(BaseModel):
    email: str
    password: str

class User(BaseModel):
    user_id: str
    email: str
    name: str
    picture: str = ""
    subscription_type: str = "free"
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ScanHistory(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: Optional[str] = None
    barcode: str
    product_name: str
    brand: str = ""
    image_url: str = ""
    health_score: int = 0
    nutri_score: str = ""
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ScanHistoryCreate(BaseModel):
    barcode: str
    product_name: str
    brand: str = ""
    image_url: str = ""
    health_score: int = 0
    nutri_score: str = ""

class WeeklyMenu(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    week_start: datetime
    menu_data: Dict[str, Any]
    shopping_list: List[str]
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class AdditiveInfo(BaseModel):
    code: str
    name: str
    risk: str
    description: str
    details: str
    sources: List[str]
    daily_limit: str

class ProductResponse(BaseModel):
    barcode: str
    name: str
    brand: str
    image_url: str
    health_score: int
    nutri_score: str
    nutri_score_grade: str
    nova_group: int
    additives: List[Dict[str, Any]]
    nutrients: Dict[str, Any]
    categories: List[str]
    pro_tip: str
    found: bool = True
    ingredients_text: str = ""
    ingredients_list: List[Dict[str, Any]] = []
    allergens: List[str] = []
    health_risks: List[Dict[str, Any]] = []
    is_vegan: bool = False
    is_vegetarian: bool = False
    is_palm_oil_free: bool = True

class AlternativeProduct(BaseModel):
    barcode: str
    name: str
    brand: str
    image_url: str
    health_score: int
    nutri_score: str

# ============== HELPER FUNCTIONS ==============
def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))

def create_jwt_token(user_id: str, email: str) -> str:
    payload = {
        "user_id": user_id,
        "email": email,
        "exp": datetime.now(timezone.utc) + timedelta(days=JWT_EXPIRATION_DAYS)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

def decode_jwt_token(token: str) -> Optional[Dict]:
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except:
        return None

async def get_current_user(request: Request, credentials: HTTPAuthorizationCredentials = Depends(security)) -> Optional[User]:
    token = None
    if credentials:
        token = credentials.credentials
    if not token:
        token = request.cookies.get("session_token")
    if not token:
        return None
    
    # Check JWT token
    payload = decode_jwt_token(token)
    if payload:
        user_doc = await db.users.find_one({"user_id": payload.get("user_id")}, {"_id": 0})
        if user_doc:
            return User(**user_doc)
    
    # Check session token (for Google Auth)
    session = await db.user_sessions.find_one({"session_token": token}, {"_id": 0})
    if session:
        expires_at = session.get("expires_at")
        if isinstance(expires_at, str):
            expires_at = datetime.fromisoformat(expires_at)
        if expires_at.tzinfo is None:
            expires_at = expires_at.replace(tzinfo=timezone.utc)
        if expires_at > datetime.now(timezone.utc):
            user_doc = await db.users.find_one({"user_id": session.get("user_id")}, {"_id": 0})
            if user_doc:
                return User(**user_doc)
    return None

# Firebase user authentication - checks premium status from firebase_users collection
async def get_firebase_premium_user(request: Request) -> Optional[User]:
    """Get user from firebase_users collection using email from query params or headers"""
    email = request.query_params.get('email') or request.headers.get('x-user-email')
    user_id = request.query_params.get('user_id') or request.headers.get('x-user-id')
    
    if not email:
        return None
    
    # Check premium status in firebase_users collection
    firebase_user = await db.firebase_users.find_one({"email": email})
    
    if firebase_user:
        subscription_type = firebase_user.get("subscription_type", "free")
    else:
        subscription_type = "free"
    
    # Return a User object with the data we have
    return User(
        user_id=user_id or email,
        email=email,
        name=email.split('@')[0],
        subscription_type=subscription_type
    )

def calculate_health_score(product_data: dict) -> int:
    score = 50
    nutri_score_map = {'a': 100, 'b': 80, 'c': 60, 'd': 40, 'e': 20}
    nutri_grade = product_data.get('nutriscore_grade', 'c').lower()
    nutri_contribution = nutri_score_map.get(nutri_grade, 60) * 0.6
    
    nova_group = product_data.get('nova_group', 3)
    if nova_group:
        nova_map = {1: 100, 2: 75, 3: 50, 4: 25}
        nova_contribution = nova_map.get(nova_group, 50) * 0.2
    else:
        nova_contribution = 50 * 0.2
    
    additives_tags = product_data.get('additives_tags', [])
    additive_penalty = 0
    for additive in additives_tags:
        e_number = additive.replace('en:', '').lower()
        if e_number in ADDITIVES_DATABASE:
            risk = ADDITIVES_DATABASE[e_number]['risk']
            if risk == 'high':
                additive_penalty += 15
            elif risk == 'medium':
                additive_penalty += 8
            else:
                additive_penalty += 3
    
    additive_penalty = min(additive_penalty, 20)
    additive_contribution = (100 - additive_penalty * 5) * 0.2
    
    score = int(nutri_contribution + nova_contribution + additive_contribution)
    return max(0, min(100, score))

def analyze_additives(product_data: dict) -> List[Dict[str, Any]]:
    additives_tags = product_data.get('additives_tags', [])
    additives_info = []
    
    for additive in additives_tags:
        e_number = additive.replace('en:', '').lower()
        if e_number in ADDITIVES_DATABASE:
            info = ADDITIVES_DATABASE[e_number].copy()
            info['code'] = e_number.upper()
            additives_info.append(info)
        else:
            additives_info.append({
                'code': e_number.upper(),
                'name': e_number.upper(),
                'risk': 'low',
                'description': 'Additif non répertorié dans notre base',
                'details': 'Informations non disponibles',
                'sources': [],
                'daily_limit': 'Non établie'
            })
    
    return additives_info

def extract_ingredients(product_data: dict) -> tuple:
    # Prioritize French, then English ingredients text
    ingredients_text = (
        product_data.get('ingredients_text_fr', '') or 
        product_data.get('ingredients_text_en', '') or 
        product_data.get('ingredients_text', '') or ''
    )
    
    # If still not French/English, try to clean it
    if ingredients_text and not any(c in ingredients_text.lower() for c in ['sucre', 'sugar', 'eau', 'water', 'sel', 'salt']):
        # Try alternative fields
        ingredients_text = product_data.get('ingredients_text_with_allergens_fr', '') or ingredients_text
    
    ingredients_list = []
    raw_ingredients = product_data.get('ingredients', [])
    
    for ing in raw_ingredients[:15]:  # Limit to 15 for performance
        # Get name in French or English
        name = ing.get('text', '')
        if not name:
            ing_id = ing.get('id', '')
            name = ing_id.replace('en:', '').replace('fr:', '').replace('-', ' ').title()
        
        ingredients_list.append({
            'id': ing.get('id', ''),
            'name': name,
            'percent': ing.get('percent_estimate', 0) or 0,
            'vegan': ing.get('vegan', 'unknown'),
            'vegetarian': ing.get('vegetarian', 'unknown'),
        })
    
    return ingredients_text, ingredients_list

def extract_allergens(product_data: dict) -> List[str]:
    allergens_tags = product_data.get('allergens_tags', [])
    allergen_names = {
        'en:gluten': 'Gluten', 'en:milk': 'Lait', 'en:eggs': 'Oeufs',
        'en:nuts': 'Fruits à coque', 'en:peanuts': 'Arachides', 'en:soybeans': 'Soja',
        'en:celery': 'Céleri', 'en:mustard': 'Moutarde', 'en:sesame-seeds': 'Sésame',
        'en:fish': 'Poisson', 'en:crustaceans': 'Crustacés', 'en:molluscs': 'Mollusques',
        'en:lupin': 'Lupin', 'en:sulphur-dioxide-and-sulphites': 'Sulfites',
    }
    return [allergen_names.get(tag, tag.replace('en:', '').replace('-', ' ').title()) for tag in allergens_tags]

def analyze_health_risks(product_data: dict, additives: List[Dict], nutrients: Dict) -> List[Dict[str, Any]]:
    risks = []
    
    nova_group = product_data.get('nova_group', 0)
    if nova_group == 4:
        risks.append({'title': 'Produit ultra-transformé', 'description': 'Ce produit est classé NOVA 4 (ultra-transformé). La consommation régulière est associée à un risque accru de maladies cardiovasculaires, diabète et obésité.', 'severity': 'high', 'icon': 'factory'})
    elif nova_group == 3:
        risks.append({'title': 'Produit transformé', 'description': 'Ce produit est classé NOVA 3 (transformé). Privilégiez les aliments moins transformés.', 'severity': 'medium', 'icon': 'cog'})
    
    sugars = nutrients.get('sugars', 0) or 0
    if sugars > 20:
        risks.append({'title': 'Très riche en sucres', 'description': f'Contient {sugars}g de sucres pour 100g. Risque de diabète, obésité et caries.', 'severity': 'high', 'icon': 'cube'})
    elif sugars > 10:
        risks.append({'title': 'Riche en sucres', 'description': f'Contient {sugars}g de sucres pour 100g.', 'severity': 'medium', 'icon': 'cube'})
    
    sat_fat = nutrients.get('saturated_fat', 0) or 0
    if sat_fat > 10:
        risks.append({'title': 'Très riche en graisses saturées', 'description': f'Contient {sat_fat}g de graisses saturées. Risque cardiovasculaire.', 'severity': 'high', 'icon': 'heart'})
    elif sat_fat > 5:
        risks.append({'title': 'Riche en graisses saturées', 'description': f'Contient {sat_fat}g de graisses saturées.', 'severity': 'medium', 'icon': 'heart'})
    
    salt = nutrients.get('salt', 0) or 0
    if salt > 1.5:
        risks.append({'title': 'Très riche en sel', 'description': f'Contient {salt}g de sel. Risque d\'hypertension.', 'severity': 'high', 'icon': 'water'})
    elif salt > 0.6:
        risks.append({'title': 'Riche en sel', 'description': f'Contient {salt}g de sel.', 'severity': 'medium', 'icon': 'water'})
    
    ingredients_analysis = product_data.get('ingredients_analysis_tags', [])
    if 'en:palm-oil' in ingredients_analysis:
        risks.append({'title': 'Contient de l\'huile de palme', 'description': 'Riche en graisses saturées, impact environnemental important.', 'severity': 'medium', 'icon': 'leaf'})
    
    high_risk_additives = [a for a in additives if a.get('risk') == 'high']
    if high_risk_additives:
        additive_names = ', '.join([a.get('code', '') for a in high_risk_additives[:3]])
        risks.append({'title': 'Additifs à risque', 'description': f'Contient: {additive_names}. Ces substances peuvent présenter des risques.', 'severity': 'high', 'icon': 'flask'})
    
    return risks

def extract_nutrients(product_data: dict) -> Dict[str, Any]:
    nutriments = product_data.get('nutriments', {})
    return {
        'energy_kcal': nutriments.get('energy-kcal_100g', 0),
        'fat': nutriments.get('fat_100g', 0),
        'saturated_fat': nutriments.get('saturated-fat_100g', 0),
        'carbohydrates': nutriments.get('carbohydrates_100g', 0),
        'sugars': nutriments.get('sugars_100g', 0),
        'fiber': nutriments.get('fiber_100g', 0),
        'proteins': nutriments.get('proteins_100g', 0),
        'salt': nutriments.get('salt_100g', 0),
        'sodium': nutriments.get('sodium_100g', 0),
    }

def get_pro_tip(product_data: dict, health_score: int) -> str:
    nutrients = product_data.get('nutriments', {})
    
    fiber = nutrients.get('fiber_100g', 0)
    if fiber and fiber > 5:
        return "✨ Riche en fibres ! Excellent pour la digestion."
    
    proteins = nutrients.get('proteins_100g', 0)
    if proteins and proteins > 15:
        return "💪 Riche en protéines ! Idéal pour les muscles."
    
    sugars = nutrients.get('sugars_100g', 0)
    if sugars is not None and sugars < 5:
        return "🍃 Faible en sucre ! Bon choix pour la glycémie."
    
    if sugars and sugars > 20:
        return "⚠️ Très sucré. À consommer avec modération."
    
    if health_score >= 70:
        return "✅ Excellent choix nutritionnel !"
    elif health_score >= 50:
        return "📊 Valeur nutritionnelle moyenne."
    else:
        return "💡 Pensez aux alternatives plus saines."

def check_dietary_info(product_data: dict) -> tuple:
    analysis = product_data.get('ingredients_analysis_tags', [])
    is_vegan = 'en:vegan' in analysis
    is_vegetarian = 'en:vegetarian' in analysis or is_vegan
    is_palm_oil_free = 'en:palm-oil-free' in analysis
    return is_vegan, is_vegetarian, is_palm_oil_free

# ============== AUTH ROUTES ==============
@api_router.post("/auth/register")
async def register(user_data: UserCreate):
    existing = await db.users.find_one({"email": user_data.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email déjà utilisé")
    
    user_id = f"user_{uuid.uuid4().hex[:12]}"
    hashed_password = hash_password(user_data.password)
    
    user_doc = {
        "user_id": user_id,
        "email": user_data.email,
        "name": user_data.name,
        "password": hashed_password,
        "picture": "",
        "subscription_type": "free",
        "created_at": datetime.now(timezone.utc)
    }
    await db.users.insert_one(user_doc)
    
    token = create_jwt_token(user_id, user_data.email)
    return {"token": token, "user": {"user_id": user_id, "email": user_data.email, "name": user_data.name, "subscription_type": "free"}}

@api_router.post("/auth/login")
async def login(credentials: UserLogin):
    user_doc = await db.users.find_one({"email": credentials.email})
    if not user_doc or not verify_password(credentials.password, user_doc.get("password", "")):
        raise HTTPException(status_code=401, detail="Email ou mot de passe incorrect")
    
    token = create_jwt_token(user_doc["user_id"], user_doc["email"])
    return {"token": token, "user": {"user_id": user_doc["user_id"], "email": user_doc["email"], "name": user_doc["name"], "subscription_type": user_doc.get("subscription_type", "free")}}

@api_router.post("/auth/session")
async def process_session(request: Request, response: Response):
    """Process Google OAuth session_id and create session"""
    body = await request.json()
    session_id = body.get("session_id")
    
    if not session_id:
        raise HTTPException(status_code=400, detail="session_id requis")
    
    async with httpx.AsyncClient() as client:
        resp = await client.get(
            "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data",
            headers={"X-Session-ID": session_id}
        )
        if resp.status_code != 200:
            raise HTTPException(status_code=401, detail="Session invalide")
        
        data = resp.json()
    
    user_doc = await db.users.find_one({"email": data["email"]}, {"_id": 0})
    if not user_doc:
        user_id = f"user_{uuid.uuid4().hex[:12]}"
        user_doc = {
            "user_id": user_id,
            "email": data["email"],
            "name": data["name"],
            "picture": data.get("picture", ""),
            "subscription_type": "free",
            "created_at": datetime.now(timezone.utc)
        }
        await db.users.insert_one(user_doc)
    else:
        user_id = user_doc["user_id"]
        await db.users.update_one({"email": data["email"]}, {"$set": {"name": data["name"], "picture": data.get("picture", "")}})
    
    session_token = data.get("session_token", str(uuid.uuid4()))
    expires_at = datetime.now(timezone.utc) + timedelta(days=7)
    
    await db.user_sessions.insert_one({
        "user_id": user_id,
        "session_token": session_token,
        "expires_at": expires_at,
        "created_at": datetime.now(timezone.utc)
    })
    
    response.set_cookie(
        key="session_token",
        value=session_token,
        httponly=True,
        secure=True,
        samesite="none",
        path="/",
        max_age=7*24*60*60
    )
    
    return {"user_id": user_id, "email": data["email"], "name": data["name"], "picture": data.get("picture", ""), "subscription_type": user_doc.get("subscription_type", "free")}

@api_router.get("/auth/me")
async def get_me(user: User = Depends(get_current_user)):
    if not user:
        raise HTTPException(status_code=401, detail="Non authentifié")
    return user

@api_router.post("/auth/logout")
async def logout(request: Request, response: Response):
    token = request.cookies.get("session_token")
    if token:
        await db.user_sessions.delete_one({"session_token": token})
    response.delete_cookie("session_token")
    return {"message": "Déconnexion réussie"}

# ============== PRODUCT ROUTES ==============
@api_router.get("/")
async def root():
    return {"message": "NutriScan API V2 - Scan, Analyze, Eat Better!"}

@api_router.get("/product/{barcode}", response_model=ProductResponse)
async def get_product(barcode: str):
    # Check cache first
    if barcode in PRODUCT_CACHE:
        logger.info(f"Cache hit for product {barcode}")
        return PRODUCT_CACHE[barcode]
    
    try:
        # Increased timeout to 25s for better reliability
        async with httpx.AsyncClient(timeout=25.0) as client:
            response = await client.get(f"https://world.openfoodfacts.org/api/v0/product/{barcode}.json")
            data = response.json()
            
            if data.get('status') != 1:
                result = ProductResponse(barcode=barcode, name="Produit non trouve", brand="", image_url="", health_score=0, nutri_score="", nutri_score_grade="", nova_group=0, additives=[], nutrients={}, categories=[], pro_tip="Scannez un autre produit.", found=False)
                return result
            
            product = data.get('product', {})
            health_score = calculate_health_score(product)
            additives = analyze_additives(product)
            nutrients = extract_nutrients(product)
            pro_tip = get_pro_tip(product, health_score)
            categories = [c.replace('en:', '').replace('-', ' ').title() for c in product.get('categories_tags', [])[:5]]
            ingredients_text, ingredients_list = extract_ingredients(product)
            allergens = extract_allergens(product)
            health_risks = analyze_health_risks(product, additives, nutrients)
            is_vegan, is_vegetarian, is_palm_oil_free = check_dietary_info(product)
            
            result = ProductResponse(
                barcode=barcode, name=product.get('product_name', 'Produit inconnu'),
                brand=product.get('brands', 'Marque inconnue'), image_url=product.get('image_url', ''),
                health_score=health_score, nutri_score=product.get('nutriscore_grade', '').upper(),
                nutri_score_grade=product.get('nutriscore_grade', '').upper(),
                nova_group=product.get('nova_group', 0) or 0, additives=additives, nutrients=nutrients,
                categories=categories, pro_tip=pro_tip, found=True, ingredients_text=ingredients_text,
                ingredients_list=ingredients_list, allergens=allergens, health_risks=health_risks,
                is_vegan=is_vegan, is_vegetarian=is_vegetarian, is_palm_oil_free=is_palm_oil_free
            )
            
            # Store in cache
            PRODUCT_CACHE[barcode] = result
            logger.info(f"Cached product {barcode}")
            
            return result
    except Exception as e:
        logger.error(f"Error fetching product {barcode}: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/additive/{code}", response_model=AdditiveInfo)
async def get_additive_info(code: str):
    """Get detailed information about a specific additive"""
    code_lower = code.lower().replace('e', 'e')
    if not code_lower.startswith('e'):
        code_lower = f"e{code_lower}"
    
    if code_lower in ADDITIVES_DATABASE:
        info = ADDITIVES_DATABASE[code_lower].copy()
        info['code'] = code_lower.upper()
        return AdditiveInfo(**info)
    
    raise HTTPException(status_code=404, detail="Additif non trouvé")

@api_router.get("/alternatives/{barcode}", response_model=List[AlternativeProduct])
async def get_alternatives(barcode: str):
    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            response = await client.get(f"https://world.openfoodfacts.org/api/v0/product/{barcode}.json")
            data = response.json()
            
            if data.get('status') != 1:
                return []
            
            product = data.get('product', {})
            categories = product.get('categories_tags', [])
            if not categories:
                return []
            
            category = categories[-1] if len(categories) > 1 else categories[0]
            original_score = calculate_health_score(product)
            
            search_response = await client.get(
                "https://world.openfoodfacts.org/cgi/search.pl",
                params={'action': 'process', 'tagtype_0': 'categories', 'tag_contains_0': 'contains', 'tag_0': category, 'sort_by': 'nutriscore_score', 'page_size': 30, 'json': 1}
            )
            search_data = search_response.json()
            
            alternatives = []
            for p in search_data.get('products', []):
                if p.get('code') == barcode:
                    continue
                p_score = calculate_health_score(p)
                if p_score > original_score and p.get('product_name'):
                    alternatives.append(AlternativeProduct(
                        barcode=p.get('code', ''), name=p.get('product_name', 'Inconnu'),
                        brand=p.get('brands', 'Inconnu'), image_url=p.get('image_url', ''),
                        health_score=p_score, nutri_score=p.get('nutriscore_grade', '').upper()
                    ))
                if len(alternatives) >= 5:
                    break
            
            return sorted(alternatives, key=lambda x: x.health_score, reverse=True)[:5]
    except Exception as e:
        logger.error(f"Error fetching alternatives: {str(e)}")
        return []

# ============== HISTORY ROUTES ==============
@api_router.post("/history", response_model=ScanHistory)
async def save_scan_history(scan: ScanHistoryCreate, user: User = Depends(get_current_user)):
    # Get user_id
    user_id = user.user_id if user else None
    
    # Check if this product was already scanned recently (within last 5 seconds) to prevent duplicates
    five_seconds_ago = datetime.now(timezone.utc) - timedelta(seconds=5)
    query = {"barcode": scan.barcode, "timestamp": {"$gte": five_seconds_ago}}
    if user_id:
        query["user_id"] = user_id
    
    existing = await db.scan_history.find_one(query)
    
    if existing:
        return ScanHistory(**{**existing, "id": existing.get("id", str(uuid.uuid4()))})
    
    scan_dict = scan.model_dump()
    scan_obj = ScanHistory(**scan_dict)
    if user_id:
        scan_obj.user_id = user_id
    
    await db.scan_history.insert_one(scan_obj.model_dump())
    return scan_obj

@api_router.get("/history", response_model=List[ScanHistory])
async def get_scan_history(limit: int = 20, user: User = Depends(get_current_user)):
    query = {}
    if user:
        query["user_id"] = user.user_id
    
    scans = await db.scan_history.find(query).sort('timestamp', -1).limit(limit).to_list(limit)
    
    # Remove duplicates based on barcode, keeping only the most recent
    seen_barcodes = set()
    unique_scans = []
    for scan in scans:
        if scan['barcode'] not in seen_barcodes:
            seen_barcodes.add(scan['barcode'])
            unique_scans.append(ScanHistory(**scan))
    
    return unique_scans

@api_router.delete("/history/{scan_id}")
async def delete_scan(scan_id: str):
    result = await db.scan_history.delete_one({"id": scan_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Scan non trouvé")
    return {"message": "Scan supprimé"}

@api_router.delete("/history")
async def clear_history(user: User = Depends(get_current_user)):
    query = {}
    if user:
        query["user_id"] = user.user_id
    await db.scan_history.delete_many(query)
    return {"message": "Historique effacé"}


# ============== FRIDGE SCORE (VIRAL FEATURE) ==============
class FridgeScoreResponse(BaseModel):
    score: int
    grade: str  # A, B, C, D, E
    total_products: int
    healthy_products: int
    unhealthy_products: int
    average_nutri_score: str
    top_healthy: List[Dict[str, Any]]
    needs_improvement: List[Dict[str, Any]]
    tips: List[str]
    share_text: str

@api_router.get("/fridge-score", response_model=FridgeScoreResponse)
async def get_fridge_score(request: Request):
    """Calculate the overall health score of user's fridge based on scan history - VIRAL FEATURE"""
    user = await get_firebase_premium_user(request)
    
    # Get user's scan history
    query = {}
    if user:
        query["user_id"] = user.email
    
    scans = await db.scan_history.find(query).sort('timestamp', -1).limit(50).to_list(50)
    
    # Also try without user filter if empty
    if not scans:
        scans = await db.scan_history.find().sort('timestamp', -1).limit(20).to_list(20)
    
    if not scans:
        return FridgeScoreResponse(
            score=0,
            grade="?",
            total_products=0,
            healthy_products=0,
            unhealthy_products=0,
            average_nutri_score="?",
            top_healthy=[],
            needs_improvement=[],
            tips=["Scannez des produits pour connaître le score de votre frigo !"],
            share_text="Découvre NutriScan et analyse ton frigo ! 🥗"
        )
    
    # Remove duplicates by barcode
    seen = set()
    unique_scans = []
    for scan in scans:
        if scan['barcode'] not in seen:
            seen.add(scan['barcode'])
            unique_scans.append(scan)
    
    # Calculate metrics
    total = len(unique_scans)
    scores = [s.get('health_score', 50) for s in unique_scans]
    avg_score = sum(scores) / total if total > 0 else 50
    
    # Count healthy vs unhealthy
    healthy = sum(1 for s in scores if s >= 60)
    unhealthy = sum(1 for s in scores if s < 40)
    
    # Calculate grade
    if avg_score >= 80:
        grade = "A"
    elif avg_score >= 65:
        grade = "B"
    elif avg_score >= 50:
        grade = "C"
    elif avg_score >= 35:
        grade = "D"
    else:
        grade = "E"
    
    # Get nutri-score distribution
    nutri_scores = [s.get('nutri_score', 'C') for s in unique_scans if s.get('nutri_score')]
    if nutri_scores:
        # Most common nutri-score
        from collections import Counter
        avg_nutri = Counter(nutri_scores).most_common(1)[0][0]
    else:
        avg_nutri = "C"
    
    # Top healthy products
    top_healthy = sorted(unique_scans, key=lambda x: x.get('health_score', 0), reverse=True)[:3]
    top_healthy = [{"name": p.get('product_name', ''), "score": p.get('health_score', 0)} for p in top_healthy]
    
    # Products needing improvement
    needs_improvement = sorted(unique_scans, key=lambda x: x.get('health_score', 100))[:3]
    needs_improvement = [{"name": p.get('product_name', ''), "score": p.get('health_score', 0)} for p in needs_improvement if p.get('health_score', 100) < 50]
    
    # Generate tips
    tips = []
    if avg_score < 50:
        tips.append("🥗 Ajoutez plus de fruits et légumes frais")
    if unhealthy > healthy:
        tips.append("🔄 Remplacez les produits ultra-transformés par des alternatives saines")
    if avg_score >= 70:
        tips.append("🌟 Excellent ! Continuez comme ça !")
    if len(tips) == 0:
        tips.append("💡 Scannez plus de produits pour des conseils personnalisés")
    
    # Generate viral share text
    emoji = "🏆" if grade == "A" else "✨" if grade == "B" else "💪" if grade == "C" else "📈" if grade == "D" else "🎯"
    share_text = f"{emoji} Mon frigo a un score de {int(avg_score)}/100 ! Note: {grade}\n\n🥗 {healthy} produits sains sur {total}\n\nEt toi, quel est le score de ton frigo ? 🤔\n\n#NutriScan #ScoreFrigo #MangerMieux"
    
    return FridgeScoreResponse(
        score=int(avg_score),
        grade=grade,
        total_products=total,
        healthy_products=healthy,
        unhealthy_products=unhealthy,
        average_nutri_score=avg_nutri,
        top_healthy=top_healthy,
        needs_improvement=needs_improvement,
        tips=tips,
        share_text=share_text
    )


# ============== USER DIETARY PREFERENCES ==============
class DietaryPreferences(BaseModel):
    gluten_free: bool = False
    vegan: bool = False
    vegetarian: bool = False
    low_salt: bool = False
    low_sugar: bool = False
    lactose_free: bool = False
    nut_free: bool = False
    halal: bool = False
    kosher: bool = False
    offline_mode_enabled: bool = False
    advanced_reports_enabled: bool = False

class UserPreferencesUpdate(BaseModel):
    email: str
    preferences: DietaryPreferences

class UserPreferencesResponse(BaseModel):
    email: str
    preferences: DietaryPreferences
    updated_at: str

@api_router.get("/user-preferences/{email}")
async def get_user_preferences(email: str):
    """Get user dietary preferences"""
    try:
        user_prefs = await db.user_preferences.find_one({"email": email})
        if user_prefs:
            return UserPreferencesResponse(
                email=email,
                preferences=DietaryPreferences(**user_prefs.get("preferences", {})),
                updated_at=str(user_prefs.get("updated_at", datetime.now(timezone.utc)))
            )
        # Return default preferences if none exist
        return UserPreferencesResponse(
            email=email,
            preferences=DietaryPreferences(),
            updated_at=str(datetime.now(timezone.utc))
        )
    except Exception as e:
        logger.error(f"Error getting preferences: {e}")
        return UserPreferencesResponse(
            email=email,
            preferences=DietaryPreferences(),
            updated_at=str(datetime.now(timezone.utc))
        )

@api_router.post("/user-preferences")
async def save_user_preferences(data: UserPreferencesUpdate):
    """Save user dietary preferences"""
    try:
        prefs_dict = {
            "email": data.email,
            "preferences": data.preferences.model_dump(),
            "updated_at": datetime.now(timezone.utc)
        }
        await db.user_preferences.update_one(
            {"email": data.email},
            {"$set": prefs_dict},
            upsert=True
        )
        return {"success": True, "message": "Préférences sauvegardées"}
    except Exception as e:
        logger.error(f"Error saving preferences: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ============== OFFLINE MODE - POPULAR PRODUCTS CACHE ==============
@api_router.get("/offline-cache")
async def get_offline_cache(limit: int = 200):
    """Get popular products for offline cache"""
    try:
        # Get most scanned products from history
        pipeline = [
            {"$group": {"_id": "$barcode", "count": {"$sum": 1}, "product_name": {"$first": "$product_name"}, "health_score": {"$first": "$health_score"}, "nutri_score": {"$first": "$nutri_score"}, "image_url": {"$first": "$image_url"}}},
            {"$sort": {"count": -1}},
            {"$limit": limit}
        ]
        popular = await db.scan_history.aggregate(pipeline).to_list(limit)
        
        # Get full product data for each
        cached_products = []
        for item in popular:
            if item.get("_id"):
                cached_products.append({
                    "barcode": item["_id"],
                    "product_name": item.get("product_name", ""),
                    "health_score": item.get("health_score", 50),
                    "nutri_score": item.get("nutri_score", "C"),
                    "image_url": item.get("image_url", ""),
                    "scan_count": item.get("count", 1)
                })
        
        return {
            "products": cached_products,
            "count": len(cached_products),
            "timestamp": str(datetime.now(timezone.utc))
        }
    except Exception as e:
        logger.error(f"Error getting offline cache: {e}")
        return {"products": [], "count": 0, "timestamp": str(datetime.now(timezone.utc))}

# ============== CHECK DIETARY CONFLICTS ==============
def check_dietary_conflicts(product_data: dict, preferences: dict) -> List[Dict[str, str]]:
    """Check if product conflicts with user's dietary restrictions"""
    conflicts = []
    
    ingredients_text = (product_data.get("ingredients_text", "") or "").lower()
    labels = [l.lower() for l in (product_data.get("labels_tags", []) or [])]
    allergens = [a.lower() for a in (product_data.get("allergens_tags", []) or [])]
    
    # Gluten check
    if preferences.get("gluten_free"):
        gluten_indicators = ["gluten", "wheat", "barley", "rye", "oat", "blé", "orge", "seigle", "avoine"]
        if any(g in ingredients_text for g in gluten_indicators) or "en:gluten" in allergens:
            if "en:gluten-free" not in labels and "sans-gluten" not in labels:
                conflicts.append({"type": "gluten", "message": "Contient du gluten", "severity": "high"})
    
    # Vegan check
    if preferences.get("vegan"):
        non_vegan = ["milk", "egg", "honey", "gelatin", "lait", "oeuf", "miel", "gélatine", "beurre", "crème", "fromage", "viande", "poisson", "poulet"]
        if any(nv in ingredients_text for nv in non_vegan):
            if "en:vegan" not in labels:
                conflicts.append({"type": "vegan", "message": "Non végan", "severity": "high"})
    
    # Vegetarian check
    if preferences.get("vegetarian"):
        non_veg = ["meat", "fish", "gelatin", "viande", "poisson", "gélatine", "poulet", "boeuf", "porc"]
        if any(nv in ingredients_text for nv in non_veg):
            if "en:vegetarian" not in labels:
                conflicts.append({"type": "vegetarian", "message": "Non végétarien", "severity": "high"})
    
    # Low salt check
    if preferences.get("low_salt"):
        salt_100g = product_data.get("nutriments", {}).get("salt_100g", 0) or 0
        if salt_100g > 1.5:  # High salt threshold
            conflicts.append({"type": "salt", "message": f"Riche en sel ({salt_100g:.1f}g/100g)", "severity": "medium"})
    
    # Low sugar check
    if preferences.get("low_sugar"):
        sugars_100g = product_data.get("nutriments", {}).get("sugars_100g", 0) or 0
        if sugars_100g > 12.5:  # High sugar threshold
            conflicts.append({"type": "sugar", "message": f"Riche en sucre ({sugars_100g:.1f}g/100g)", "severity": "medium"})
    
    # Lactose free check
    if preferences.get("lactose_free"):
        lactose_indicators = ["milk", "lactose", "lait", "crème", "fromage", "beurre", "yaourt"]
        if any(l in ingredients_text for l in lactose_indicators) or "en:milk" in allergens:
            if "en:lactose-free" not in labels and "sans-lactose" not in labels:
                conflicts.append({"type": "lactose", "message": "Contient du lactose", "severity": "high"})
    
    # Nut free check
    if preferences.get("nut_free"):
        if "en:nuts" in allergens or any(n in ingredients_text for n in ["nut", "almond", "hazelnut", "noix", "amande", "noisette", "cacahuète", "arachide"]):
            conflicts.append({"type": "nuts", "message": "Contient des fruits à coque", "severity": "high"})
    
    return conflicts

@api_router.get("/product-with-preferences/{barcode}")
async def get_product_with_dietary_check(barcode: str, email: Optional[str] = None):
    """Get product with dietary conflict checks"""
    try:
        # Fetch product from Open Food Facts
        async with httpx.AsyncClient(timeout=15.0) as client:
            response = await client.get(f"https://world.openfoodfacts.org/api/v2/product/{barcode}.json")
            data = response.json()
        
        if data.get("status") != 1:
            raise HTTPException(status_code=404, detail="Produit non trouvé")
        
        product_data = data.get("product", {})
        
        # Get user preferences if email provided
        conflicts = []
        if email:
            user_prefs = await db.user_preferences.find_one({"email": email})
            if user_prefs:
                conflicts = check_dietary_conflicts(product_data, user_prefs.get("preferences", {}))
        
        # Calculate health score
        health_score = calculate_health_score(product_data)
        additives = analyze_additives(product_data)
        
        return {
            "barcode": barcode,
            "name": product_data.get("product_name", "Produit inconnu"),
            "brand": product_data.get("brands", ""),
            "image_url": product_data.get("image_url", ""),
            "health_score": health_score,
            "nutri_score": product_data.get("nutriscore_grade", "c").upper(),
            "nova_group": product_data.get("nova_group"),
            "additives": additives,
            "dietary_conflicts": conflicts,
            "has_conflicts": len(conflicts) > 0,
            "ingredients_text": product_data.get("ingredients_text", ""),
            "nutriments": product_data.get("nutriments", {}),
            "labels": product_data.get("labels_tags", []),
            "allergens": product_data.get("allergens_tags", [])
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching product with preferences: {e}")
        raise HTTPException(status_code=500, detail=str(e))




# ============== SEARCH ROUTES ==============
@api_router.get("/search")
async def search_products(q: str, page: int = 1, page_size: int = 15):
    """Search products in Open Food Facts database - optimized for speed"""
    try:
        async with httpx.AsyncClient(timeout=25.0) as client:
            # Use French API for better French results
            response = await client.get(
                "https://fr.openfoodfacts.org/cgi/search.pl",
                params={
                    'search_terms': q, 
                    'search_simple': 1, 
                    'action': 'process', 
                    'page': page, 
                    'page_size': page_size, 
                    'json': 1,
                    'fields': 'code,product_name,product_name_fr,product_name_en,brands,image_url,nutriscore_grade,nova_group',
                    'lc': 'fr',
                    'cc': 'fr'
                }
            )
            data = response.json()
            
            products = []
            for p in data.get('products', []):
                # Prioritize French name, then English, then generic
                name = p.get('product_name_fr') or p.get('product_name') or p.get('product_name_en') or ''
                if not name:
                    continue
                
                # Quick score calculation
                nutri_map = {'a': 90, 'b': 75, 'c': 55, 'd': 35, 'e': 20}
                nutri_grade = (p.get('nutriscore_grade') or 'c').lower()
                score = nutri_map.get(nutri_grade, 50)
                
                nova = p.get('nova_group')
                if nova == 4:
                    score -= 15
                elif nova == 1:
                    score += 10
                
                products.append({
                    'barcode': p.get('code', ''),
                    'name': name,
                    'brand': p.get('brands', ''),
                    'image_url': p.get('image_url', ''),
                    'health_score': max(0, min(100, score)),
                    'nutri_score': (p.get('nutriscore_grade') or '').upper()
                })
            
            return {'products': products, 'count': data.get('count', 0), 'page': page, 'page_size': page_size}
    except Exception as e:
        logger.error(f"Search error: {str(e)}")
        return {'products': [], 'count': 0, 'page': page, 'page_size': page_size}

# ============== RANKINGS ROUTES ==============
# Cache for rankings to improve performance
RANKINGS_CACHE = {}
RANKINGS_CACHE_TIME = None
RANKINGS_CACHE_DURATION = 300  # 5 minutes

# Pre-defined healthy products for fast loading with real product images
HEALTHY_PRODUCTS_FALLBACK = [
    {"barcode": "3017620422003", "name": "Nutella", "brand": "Ferrero", "health_score": 34, "nutri_score": "E", "category": "all", "image_url": "https://images.openfoodfacts.org/images/products/301/762/042/2003/front_fr.335.400.jpg"},
    {"barcode": "3175681851849", "name": "Compotes pomme", "brand": "Andros", "health_score": 85, "nutri_score": "A", "category": "all", "image_url": "https://images.openfoodfacts.org/images/products/317/568/185/1849/front_fr.125.400.jpg"},
    {"barcode": "3029330003533", "name": "Yaourt nature", "brand": "Danone", "health_score": 82, "nutri_score": "A", "category": "all", "image_url": "https://images.openfoodfacts.org/images/products/302/933/000/3533/front_fr.166.400.jpg"},
    {"barcode": "3033710073436", "name": "Eau minerale", "brand": "Evian", "health_score": 95, "nutri_score": "A", "category": "all", "image_url": "https://images.openfoodfacts.org/images/products/303/371/007/3436/front_fr.107.400.jpg"},
    {"barcode": "3560071097462", "name": "Salade verte", "brand": "Carrefour Bio", "health_score": 90, "nutri_score": "A", "category": "all", "image_url": "https://images.openfoodfacts.org/images/products/356/007/109/7462/front_fr.33.400.jpg"},
    {"barcode": "3250390000684", "name": "Pain complet", "brand": "Harry's", "health_score": 78, "nutri_score": "A", "category": "all", "image_url": "https://images.openfoodfacts.org/images/products/325/039/000/0684/front_fr.64.400.jpg"},
    {"barcode": "3560070824908", "name": "Carottes bio", "brand": "Carrefour Bio", "health_score": 92, "nutri_score": "A", "category": "all", "image_url": "https://images.openfoodfacts.org/images/products/356/007/082/4908/front_fr.10.400.jpg"},
    {"barcode": "3256220040709", "name": "Tomates cerises", "brand": "U Bio", "health_score": 88, "nutri_score": "A", "category": "all", "image_url": "https://images.openfoodfacts.org/images/products/325/622/004/0709/front_fr.10.400.jpg"},
    {"barcode": "3033710074457", "name": "Lait demi-ecreme", "brand": "Lactel", "health_score": 75, "nutri_score": "A", "category": "all", "image_url": "https://images.openfoodfacts.org/images/products/303/371/007/4457/front_fr.85.400.jpg"},
    {"barcode": "3228857000906", "name": "Flocons d'avoine", "brand": "Quaker", "health_score": 80, "nutri_score": "A", "category": "all", "image_url": "https://images.openfoodfacts.org/images/products/322/885/700/0906/front_fr.70.400.jpg"},
]

@api_router.get("/rankings/{category}")
async def get_rankings(category: str = "all", limit: int = 20):
    """Get top healthy products by category"""
    global RANKINGS_CACHE, RANKINGS_CACHE_TIME
    
    cache_key = f"{category}_{limit}"
    current_time = datetime.now(timezone.utc)
    
    # Check cache first
    if RANKINGS_CACHE_TIME and cache_key in RANKINGS_CACHE:
        cache_age = (current_time - RANKINGS_CACHE_TIME).total_seconds()
        if cache_age < RANKINGS_CACHE_DURATION:
            return RANKINGS_CACHE[cache_key]
    
    try:
        async with httpx.AsyncClient(timeout=8.0) as client:  # Reduced timeout
            params = {'action': 'process', 'sort_by': 'nutriscore_score', 'page_size': 30, 'json': 1}
            
            if category != "all":
                params['tagtype_0'] = 'categories'
                params['tag_contains_0'] = 'contains'
                params['tag_0'] = category
            
            response = await client.get("https://world.openfoodfacts.org/cgi/search.pl", params=params)
            data = response.json()
            
            products = []
            for p in data.get('products', []):
                if not p.get('product_name'):
                    continue
                score = calculate_health_score(p)
                if score >= 60:
                    products.append({
                        'barcode': p.get('code', ''),
                        'name': p.get('product_name', ''),
                        'brand': p.get('brands', ''),
                        'image_url': p.get('image_url', ''),
                        'health_score': score,
                        'nutri_score': p.get('nutriscore_grade', '').upper(),
                        'category': category
                    })
            
            products.sort(key=lambda x: x['health_score'], reverse=True)
            result = products[:limit]
            
            # Cache the result
            RANKINGS_CACHE[cache_key] = result
            RANKINGS_CACHE_TIME = current_time
            
            return result
    except Exception as e:
        logger.error(f"Rankings error: {str(e)}")
        # Return fallback data
        return [p for p in HEALTHY_PRODUCTS_FALLBACK if p['health_score'] >= 60][:limit]

# ============== RECOMMENDATIONS ROUTES ==============
@api_router.get("/recommendations")
async def get_recommendations(user: User = Depends(get_current_user)):
    """Get personalized healthier alternatives based on user's scan history"""
    if not user:
        # Return general healthy recommendations
        return await get_rankings("all", 10)
    
    # Get user's recent scans
    scans = await db.scan_history.find({"user_id": user.user_id}).sort('timestamp', -1).limit(10).to_list(10)
    
    recommendations = []
    seen_barcodes = set()
    
    for scan in scans:
        if scan['health_score'] < 70:
            # Find better alternatives
            alts = await get_alternatives(scan['barcode'])
            for alt in alts:
                if alt.barcode not in seen_barcodes:
                    seen_barcodes.add(alt.barcode)
                    recommendations.append({
                        'barcode': alt.barcode,
                        'name': alt.name,
                        'brand': alt.brand,
                        'image_url': alt.image_url,
                        'health_score': alt.health_score,
                        'nutri_score': alt.nutri_score,
                        'replaces': scan['product_name']
                    })
    
    return recommendations[:10]

# ============== NATURAL HEALING FOODS ==============
HEALING_FOODS = [
    {"name": "Curcuma", "benefits": ["Anti-inflammatoire", "Antioxydant", "Digestion"], "conditions": ["Arthrite", "Inflammation", "Troubles digestifs"], "source": "OMS, NIH", "image": "🌿"},
    {"name": "Gingembre", "benefits": ["Anti-nauséeux", "Anti-inflammatoire", "Immunité"], "conditions": ["Nausées", "Rhume", "Douleurs musculaires"], "source": "NIH, Cochrane", "image": "🫚"},
    {"name": "Ail", "benefits": ["Antibactérien", "Cardiovasculaire", "Immunité"], "conditions": ["Hypertension", "Cholestérol", "Infections"], "source": "OMS, EFSA", "image": "🧄"},
    {"name": "Myrtilles", "benefits": ["Antioxydant", "Cerveau", "Vision"], "conditions": ["Déclin cognitif", "Inflammation", "Diabète"], "source": "NIH, Harvard Health", "image": "🫐"},
    {"name": "Épinards", "benefits": ["Fer", "Vitamines", "Antioxydants"], "conditions": ["Anémie", "Fatigue", "Santé oculaire"], "source": "USDA, EFSA", "image": "🥬"},
    {"name": "Saumon sauvage", "benefits": ["Oméga-3", "Protéines", "Vitamine D"], "conditions": ["Maladies cardiaques", "Dépression", "Inflammation"], "source": "AHA, NIH", "image": "🐟"},
    {"name": "Noix", "benefits": ["Oméga-3", "Antioxydants", "Fibres"], "conditions": ["Cholestérol", "Inflammation cérébrale", "Diabète"], "source": "NIH, EFSA", "image": "🥜"},
    {"name": "Avocat", "benefits": ["Graisses saines", "Potassium", "Fibres"], "conditions": ["Cholestérol", "Hypertension", "Absorption nutriments"], "source": "USDA, NIH", "image": "🥑"},
    {"name": "Brocoli", "benefits": ["Sulforaphane", "Vitamines", "Fibres"], "conditions": ["Cancer (prévention)", "Détoxification", "Inflammation"], "source": "NIH, AICR", "image": "🥦"},
    {"name": "Thé vert", "benefits": ["Catéchines", "Antioxydants", "Métabolisme"], "conditions": ["Maladies cardiaques", "Diabète", "Cancer"], "source": "NIH, Cochrane", "image": "🍵"},
    {"name": "Citron", "benefits": ["Vitamine C", "Antioxydants", "Digestion"], "conditions": ["Rhume", "Calculs rénaux", "Anémie"], "source": "NIH, USDA", "image": "🍋"},
    {"name": "Miel (brut)", "benefits": ["Antibactérien", "Cicatrisant", "Antitussif"], "conditions": ["Toux", "Plaies", "Mal de gorge"], "source": "OMS, Cochrane", "image": "🍯"},
]

@api_router.get("/healing-foods")
async def get_healing_foods():
    """Get list of natural healing foods approved by science"""
    return HEALING_FOODS

@api_router.get("/healing-foods/search")
async def search_healing_foods(condition: str):
    """Search healing foods by health condition"""
    condition_lower = condition.lower()
    results = []
    for food in HEALING_FOODS:
        for cond in food['conditions']:
            if condition_lower in cond.lower():
                results.append(food)
                break
    return results

# ============== WEEKLY MENU GENERATION ==============
class MenuRequest(BaseModel):
    family_size: int = 2

@api_router.post("/generate-menu")
async def generate_weekly_menu(request: Request):
    """Generate personalized weekly meal plan using AI"""
    # Get user from Firebase authentication
    user = await get_firebase_premium_user(request)
    
    if not user:
        raise HTTPException(status_code=401, detail="Connexion requise. Ajoutez votre email en paramètre: ?email=votre@email.com")
    
    if user.subscription_type != "premium":
        raise HTTPException(status_code=403, detail="Fonctionnalité Premium requise")
    
    # Get family size from request body
    try:
        body = await request.json()
        family_size = body.get('family_size', 2)
    except:
        family_size = 2
    
    # Get user's scan history for personalization
    scans = await db.scan_history.find({"user_id": user.user_id}).sort('timestamp', -1).limit(20).to_list(20)
    # Also try with email as user_id
    if not scans:
        scans = await db.scan_history.find({"user_id": user.email}).sort('timestamp', -1).limit(20).to_list(20)
    # Also check general history
    if not scans:
        scans = await db.scan_history.find().sort('timestamp', -1).limit(10).to_list(10)
    
    products_context = ""
    if scans:
        products_context = "Produits récemment scannés par l'utilisateur:\n"
        for scan in scans[:10]:
            products_context += f"- {scan['product_name']} (Score: {scan['health_score']}/100)\n"
    
    try:
        menu_system = f"""Tu es un nutritionniste expert. Génère un menu hebdomadaire sain et équilibré pour {family_size} personne(s).
        
        RÈGLES STRICTES POUR LA LISTE DE COURSES:
        1. La liste de courses doit contenir UNIQUEMENT des INGRÉDIENTS BRUTS à acheter
        2. NE PAS mettre de descriptions de repas ou recettes dans la liste
        3. Format simple: "quantité + ingrédient" (ex: "1kg poulet", "6 oeufs", "500g riz")
        4. Regrouper les ingrédients similaires
        5. Adapter les quantités pour {family_size} personne(s) sur 7 jours
        
        EXEMPLES CORRECTS pour liste_courses:
        ✅ "1.5kg de poulet"
        ✅ "500g de riz basmati"  
        ✅ "12 oeufs"
        ✅ "2L de lait"
        ✅ "1kg de tomates"
        
        EXEMPLES INCORRECTS (NE PAS FAIRE):
        ❌ "Poulet grillé aux herbes avec légumes"
        ❌ "Omelette aux champignons"
        ❌ "Salade de quinoa"
        
        Réponds UNIQUEMENT en JSON valide:
        {{
            "samedi": {{"petit_dejeuner": "...", "dejeuner": "...", "diner": "...", "collation": "..."}},
            "dimanche": {{"petit_dejeuner": "...", "dejeuner": "...", "diner": "...", "collation": "..."}},
            "lundi": {{"petit_dejeuner": "...", "dejeuner": "...", "diner": "...", "collation": "..."}},
            "mardi": {{"petit_dejeuner": "...", "dejeuner": "...", "diner": "...", "collation": "..."}},
            "mercredi": {{"petit_dejeuner": "...", "dejeuner": "...", "diner": "...", "collation": "..."}},
            "jeudi": {{"petit_dejeuner": "...", "dejeuner": "...", "diner": "...", "collation": "..."}},
            "vendredi": {{"petit_dejeuner": "...", "dejeuner": "...", "diner": "...", "collation": "..."}},
            "liste_courses": ["1.5kg poulet", "500g riz", "12 oeufs", "2L lait", "1kg tomates", "500g carottes", ...],
            "nombre_personnes": {family_size}
        }}"""
        
        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=f"menu_{user.user_id}_{datetime.now().strftime('%Y%m%d')}",
            system_message=menu_system
        ).with_model("openai", "gpt-5.2")
        
        prompt = f"""Génère un menu hebdomadaire sain (du samedi au vendredi) pour une personne.
        
        {products_context}
        
        Critères:
        - Privilégier les aliments non transformés (NOVA 1-2)
        - Varier les sources de protéines
        - Inclure des légumes à chaque repas
        - Limiter les sucres ajoutés
        - Proposer des alternatives saines aux produits ultra-transformés
        
        Réponds uniquement avec le JSON du menu."""
        
        message = UserMessage(text=prompt)
        response = await chat.send_message(message)
        
        import json
        menu_data = json.loads(response)
        
        menu = WeeklyMenu(
            user_id=user.user_id,
            week_start=datetime.now(timezone.utc),
            menu_data=menu_data,
            shopping_list=menu_data.get('liste_courses', [])
        )
        
        await db.weekly_menus.insert_one(menu.model_dump())
        
        return menu_data
    except Exception as e:
        logger.error(f"Menu generation error: {str(e)}")
        raise HTTPException(status_code=500, detail="Erreur lors de la génération du menu")

# ============== AI COACH ==============
class CoachMessage(BaseModel):
    message: str
    context: Optional[Dict[str, Any]] = None

@api_router.post("/coach")
async def ai_coach_chat(request: Request, body: CoachMessage):
    """AI Coach for personalized nutrition advice - Premium feature"""
    user = await get_firebase_premium_user(request)
    
    if not user:
        raise HTTPException(status_code=401, detail="Connexion requise")
    
    if user.subscription_type != "premium":
        raise HTTPException(status_code=403, detail="Fonctionnalité Premium requise")
    
    try:
        # Get user's scan history for context - try multiple identifiers
        history = await db.scan_history.find({"user_id": user.email}).sort('timestamp', -1).limit(15).to_list(15)
        if not history:
            history = await db.scan_history.find({"user_id": user.user_id}).sort('timestamp', -1).limit(15).to_list(15)
        if not history:
            # Get all recent scans as fallback
            history = await db.scan_history.find().sort('timestamp', -1).limit(10).to_list(10)
        
        history_context = ""
        if history:
            history_context = "\n".join([f"- {h.get('product_name', 'Produit inconnu')} (Score: {h.get('health_score', 'N/A')}/100)" for h in history])
        
        # Get user's health goals
        goals = await db.health_goals.find({"user_id": user.email}).to_list(10)
        goals_context = ""
        if goals:
            goals_context = ", ".join([g.get('name', '') for g in goals])
        
        # Build context for AI
        no_products_msg = "Aucun produit scanné récemment"
        system_prompt = f"""Tu es NutriCoach, un coach nutrition IA expert et bienveillant pour l'application NutriScan.

PROFIL UTILISATEUR:
- Email: {user.email}
- Objectifs santé: {goals_context if goals_context else 'Non définis'}
- Derniers produits scannés ({len(history)} produits):
{history_context if history_context else no_products_msg}

TON RÔLE:
- Donner des conseils nutritionnels personnalisés et pratiques
- Analyser les produits scannés par l'utilisateur quand il le demande
- Suggérer des alternatives plus saines
- Motiver et encourager l'utilisateur dans ses objectifs
- Expliquer les scores nutritionnels et les additifs

RÈGLES:
- Réponds toujours en français
- Sois concis mais informatif (max 250 mots)
- Utilise des emojis pour rendre le message plus engageant
- Quand l'utilisateur demande d'analyser ses produits, base-toi sur la liste ci-dessus
- Ne prescris jamais de médicaments ou traitements médicaux
- Recommande de consulter un professionnel pour les problèmes de santé graves
- Termine toujours par une question ou une suggestion actionnable"""

        # Use Emergent LLM
        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=f"coach_{user.email}_{datetime.now().strftime('%Y%m%d%H%M')}",
            system_message=system_prompt
        ).with_model("openai", "gpt-4o-mini")
        
        message = UserMessage(text=body.message)
        response = await chat.send_message(message)
        
        # Response is a string directly
        response_text = response if isinstance(response, str) else str(response)
        
        # Save conversation to DB
        conversation = {
            "id": str(uuid.uuid4()),
            "user_id": user.email,
            "user_message": body.message,
            "coach_response": response_text,
            "timestamp": datetime.now(timezone.utc)
        }
        await db.coach_conversations.insert_one(conversation)
        
        return {
            "response": response_text,
            "conversation_id": conversation["id"]
        }
        
    except Exception as e:
        logger.error(f"Coach error: {str(e)}")
        raise HTTPException(status_code=500, detail="Erreur du coach IA")

@api_router.get("/coach/history")
async def get_coach_history(request: Request):
    """Get user's chat history with AI Coach"""
    user = await get_firebase_premium_user(request)
    
    if not user:
        raise HTTPException(status_code=401, detail="Connexion requise")
    
    conversations = await db.coach_conversations.find(
        {"user_id": user.email}, 
        {"_id": 0}
    ).sort('timestamp', -1).limit(20).to_list(20)
    
    return conversations

# Audio transcription endpoint
from fastapi import UploadFile, File
import base64
import tempfile

@api_router.get("/my-menus")
async def get_my_menus(user: User = Depends(get_current_user)):
    """Get user's generated menus"""
    if not user:
        raise HTTPException(status_code=401, detail="Connexion requise")
    
    menus = await db.weekly_menus.find({"user_id": user.user_id}).sort('created_at', -1).limit(4).to_list(4)
    return [{"id": m.get("id"), "week_start": m.get("week_start"), "menu_data": m.get("menu_data"), "shopping_list": m.get("shopping_list")} for m in menus]

# ============== SUBSCRIPTION ==============
@api_router.post("/subscribe")
async def subscribe_premium(user: User = Depends(get_current_user)):
    """Upgrade to premium subscription"""
    if not user:
        raise HTTPException(status_code=401, detail="Connexion requise")
    
    await db.users.update_one({"user_id": user.user_id}, {"$set": {"subscription_type": "premium"}})
    return {"message": "Abonnement Premium activé", "subscription_type": "premium"}

@api_router.get("/subscription-status")
async def get_subscription_status(user: User = Depends(get_current_user)):
    if not user:
        return {"subscription_type": "free", "features": ["scan", "history", "search"]}
    
    features = ["scan", "history", "search", "rankings"]
    if user.subscription_type == "premium":
        features.extend(["weekly_menu", "advanced_recommendations", "healing_foods_details", "priority_support"])
    
    return {"subscription_type": user.subscription_type, "features": features}

# ============== STRIPE PAYMENT ==============
class CreateCheckoutRequest(BaseModel):
    plan: str  # 'monthly' or 'yearly'
    success_url: str
    cancel_url: str
    user_email: Optional[str] = None
    user_id: Optional[str] = None

@api_router.post("/create-checkout-session")
async def create_checkout_session(request: CreateCheckoutRequest, user: User = Depends(get_current_user)):
    """Create a Stripe checkout session for Premium subscription"""
    
    # Use request data as primary source (for Firebase users), fallback to JWT user
    user_email = request.user_email or (user.email if user else None)
    user_id = request.user_id or (user.user_id if user else None)
    
    logger.info(f"Checkout request - email: {user_email}, user_id: {user_id}")
    
    if not user_email:
        raise HTTPException(status_code=401, detail="Email requis pour le paiement")
    
    # ============== PROTECTION CONTRE LES PAIEMENTS MULTIPLES ==============
    # Check if user already has premium subscription
    existing_premium = await db.firebase_users.find_one({"email": user_email})
    if existing_premium and existing_premium.get("subscription_type") == "premium":
        # Check if they have an active Stripe subscription
        stripe_sub_id = existing_premium.get("stripe_subscription_id")
        if stripe_sub_id:
            try:
                subscription = stripe.Subscription.retrieve(stripe_sub_id)
                if subscription.status in ['active', 'trialing']:
                    raise HTTPException(
                        status_code=400, 
                        detail="Vous etes deja abonne Premium! Votre abonnement est actif. Gerez votre abonnement depuis votre profil."
                    )
            except stripe.error.InvalidRequestError:
                # Subscription doesn't exist in Stripe anymore, allow new subscription
                pass
        else:
            # User is premium but no Stripe ID - check our database
            raise HTTPException(
                status_code=400, 
                detail="Votre compte est deja Premium! Actualisez votre statut sur l'ecran profil."
            )
    
    # Also check users collection
    existing_user = await db.users.find_one({"email": user_email})
    if existing_user and existing_user.get("subscription_type") == "premium":
        stripe_sub_id = existing_user.get("stripe_subscription_id")
        if stripe_sub_id:
            try:
                subscription = stripe.Subscription.retrieve(stripe_sub_id)
                if subscription.status in ['active', 'trialing']:
                    raise HTTPException(
                        status_code=400, 
                        detail="Vous etes deja abonne Premium! Votre abonnement est actif."
                    )
            except stripe.error.InvalidRequestError:
                pass
    # ============== FIN PROTECTION PAIEMENTS MULTIPLES ==============
    
    # Define prices - Updated to new pricing (9.99€/month, 69.99€/year)
    prices = {
        'monthly': {
            'amount': 999,  # 9.99 EUR in cents
            'interval': 'month',
            'name': 'NutriScan Premium - Mensuel'
        },
        'yearly': {
            'amount': 6999,  # 69.99 EUR in cents
            'interval': 'year',
            'name': 'NutriScan Premium - Annuel (Économisez 40%)'
        }
    }
    
    if request.plan not in prices:
        raise HTTPException(status_code=400, detail="Plan invalide")
    
    plan_info = prices[request.plan]
    
    try:
        # Create Stripe checkout session
        checkout_session = stripe.checkout.Session.create(
            payment_method_types=['card'],
            line_items=[{
                'price_data': {
                    'currency': 'eur',
                    'product_data': {
                        'name': plan_info['name'],
                        'description': 'Acces Premium a NutriScan avec menus IA, objectifs sante, et plus',
                    },
                    'unit_amount': plan_info['amount'],
                    'recurring': {
                        'interval': plan_info['interval'],
                    },
                },
                'quantity': 1,
            }],
            mode='subscription',
            success_url=request.success_url + '?session_id={CHECKOUT_SESSION_ID}',
            cancel_url=request.cancel_url,
            client_reference_id=user_id or user_email,
            customer_email=user_email,
            metadata={
                'user_id': user_id or user_email,
                'user_email': user_email,
                'plan': request.plan
            }
        )
        
        return {
            'checkout_url': checkout_session.url,
            'session_id': checkout_session.id
        }
    except stripe.error.StripeError as e:
        logger.error(f"Stripe error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Erreur de paiement: {str(e)}")

@api_router.post("/webhook/stripe")
async def stripe_webhook(request: Request):
    """Handle Stripe webhooks for subscription events"""
    payload = await request.body()
    sig_header = request.headers.get('stripe-signature')
    
    # For now, we'll process without signature verification
    # In production, you should verify the webhook signature
    try:
        event = stripe.Event.construct_from(
            stripe.util.convert_to_stripe_object(payload),
            stripe.api_key
        )
    except Exception as e:
        logger.error(f"Webhook error: {str(e)}")
        raise HTTPException(status_code=400, detail="Invalid payload")
    
    # Handle the event
    if event['type'] == 'checkout.session.completed':
        session = event['data']['object']
        user_id = session.get('client_reference_id') or session.get('metadata', {}).get('user_id')
        
        if user_id:
            # Update user to premium
            await db.users.update_one(
                {"user_id": user_id},
                {"$set": {
                    "subscription_type": "premium",
                    "stripe_customer_id": session.get('customer'),
                    "stripe_subscription_id": session.get('subscription'),
                    "premium_since": datetime.now(timezone.utc)
                }}
            )
            logger.info(f"User {user_id} upgraded to premium")
    
    elif event['type'] == 'customer.subscription.deleted':
        subscription = event['data']['object']
        customer_id = subscription.get('customer')
        
        # Downgrade user
        await db.users.update_one(
            {"stripe_customer_id": customer_id},
            {"$set": {"subscription_type": "free"}}
        )
        logger.info(f"Subscription cancelled for customer {customer_id}")
    
    return {"status": "success"}

@api_router.get("/stripe-public-key")
async def get_stripe_public_key():
    """Get Stripe public key for frontend"""
    return {"public_key": STRIPE_PUBLIC_KEY}

@api_router.post("/verify-payment")
async def verify_payment(email: str, user_id: str = None):
    """Verify if user has paid and activate premium"""
    try:
        # Check Stripe for recent payments with this email
        customers = stripe.Customer.list(email=email, limit=1)
        
        if customers.data:
            customer = customers.data[0]
            # Check if customer has active subscription
            subscriptions = stripe.Subscription.list(customer=customer.id, status='active', limit=1)
            
            if subscriptions.data:
                # User has active subscription - save to our DB
                await db.firebase_users.update_one(
                    {"email": email},
                    {"$set": {
                        "email": email,
                        "user_id": user_id or email,
                        "subscription_type": "premium",
                        "stripe_customer_id": customer.id,
                        "stripe_subscription_id": subscriptions.data[0].id,
                        "premium_since": datetime.now(timezone.utc)
                    }},
                    upsert=True
                )
                logger.info(f"Premium activated for {email}")
                return {"status": "premium", "message": "Votre abonnement Premium est actif!"}
        
        # Also check for recent checkout sessions
        sessions = stripe.checkout.Session.list(limit=10)
        for session in sessions.data:
            if session.customer_email == email and session.payment_status == 'paid':
                await db.firebase_users.update_one(
                    {"email": email},
                    {"$set": {
                        "email": email,
                        "user_id": user_id or email,
                        "subscription_type": "premium",
                        "stripe_session_id": session.id,
                        "premium_since": datetime.now(timezone.utc)
                    }},
                    upsert=True
                )
                logger.info(f"Premium activated via session for {email}")
                return {"status": "premium", "message": "Votre abonnement Premium est actif!"}
        
        return {"status": "free", "message": "Aucun paiement trouvé"}
    except Exception as e:
        logger.error(f"Verify payment error: {str(e)}")
        return {"status": "error", "message": str(e)}

@api_router.get("/check-premium/{email}")
async def check_premium_status(email: str):
    """Check if user has premium subscription"""
    # Check our local DB first
    firebase_user = await db.firebase_users.find_one({"email": email})
    if firebase_user and firebase_user.get("subscription_type") == "premium":
        return {"is_premium": True, "subscription_type": "premium"}
    
    # Check Stripe
    try:
        customers = stripe.Customer.list(email=email, limit=1)
        if customers.data:
            customer = customers.data[0]
            subscriptions = stripe.Subscription.list(customer=customer.id, status='active', limit=1)
            if subscriptions.data:
                # Update our DB
                await db.firebase_users.update_one(
                    {"email": email},
                    {"$set": {"subscription_type": "premium", "email": email}},
                    upsert=True
                )
                return {"is_premium": True, "subscription_type": "premium"}
    except Exception as e:
        logger.error(f"Check premium error: {str(e)}")
    
    return {"is_premium": False, "subscription_type": "free"}

# Activate premium for user who already paid
@api_router.post("/activate-premium")
async def activate_premium_manual(email: str):
    """Manually activate premium for a user (for support)"""
    await db.firebase_users.update_one(
        {"email": email},
        {"$set": {
            "email": email,
            "subscription_type": "premium",
            "premium_since": datetime.now(timezone.utc),
            "activated_manually": True
        }},
        upsert=True
    )
    logger.info(f"Premium manually activated for {email}")
    return {"status": "success", "message": f"Premium activé pour {email}"}

# ============== HEALTH GOALS ==============
class HealthGoal(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    goal_type: str  # "reduce_sugar", "reduce_salt", "reduce_fat", "avoid_additives", "increase_fiber", "increase_protein"
    target_value: float = 0
    current_progress: float = 0
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    is_active: bool = True

GOAL_TYPES = {
    "reduce_sugar": {"name": "Réduire le sucre", "unit": "g", "icon": "cube", "description": "Limiter les sucres ajoutés à moins de 25g/jour"},
    "reduce_salt": {"name": "Réduire le sel", "unit": "g", "icon": "water", "description": "Limiter le sel à moins de 5g/jour"},
    "reduce_fat": {"name": "Réduire les graisses saturées", "unit": "g", "icon": "heart", "description": "Limiter les graisses saturées à moins de 20g/jour"},
    "avoid_additives": {"name": "Éviter les additifs à risque", "unit": "additifs", "icon": "flask", "description": "Éviter les additifs E250, E621, E951..."},
    "increase_fiber": {"name": "Augmenter les fibres", "unit": "g", "icon": "leaf", "description": "Consommer au moins 25g de fibres/jour"},
    "increase_protein": {"name": "Augmenter les protéines", "unit": "g", "icon": "fitness", "description": "Consommer au moins 50g de protéines/jour"},
}

@api_router.get("/goals/types")
async def get_goal_types():
    """Get available health goal types"""
    return GOAL_TYPES

@api_router.get("/goals")
async def get_user_goals(user: User = Depends(get_current_user)):
    """Get user's health goals"""
    if not user:
        raise HTTPException(status_code=401, detail="Connexion requise")
    
    goals = await db.health_goals.find({"user_id": user.user_id, "is_active": True}).to_list(10)
    return [{"id": g.get("id"), "goal_type": g.get("goal_type"), "target_value": g.get("target_value"), 
             "current_progress": g.get("current_progress"), "created_at": g.get("created_at"),
             **GOAL_TYPES.get(g.get("goal_type"), {})} for g in goals]

@api_router.post("/goals")
async def create_goal(goal_type: str, target_value: float = 0, user: User = Depends(get_current_user)):
    """Create a new health goal"""
    if not user:
        raise HTTPException(status_code=401, detail="Connexion requise")
    
    if goal_type not in GOAL_TYPES:
        raise HTTPException(status_code=400, detail="Type d'objectif invalide")
    
    # Check if goal already exists
    existing = await db.health_goals.find_one({"user_id": user.user_id, "goal_type": goal_type, "is_active": True})
    if existing:
        raise HTTPException(status_code=400, detail="Cet objectif existe déjà")
    
    goal = HealthGoal(user_id=user.user_id, goal_type=goal_type, target_value=target_value)
    await db.health_goals.insert_one(goal.model_dump())
    
    return {"message": "Objectif créé", "goal": {**goal.model_dump(), **GOAL_TYPES.get(goal_type, {})}}

@api_router.delete("/goals/{goal_id}")
async def delete_goal(goal_id: str, user: User = Depends(get_current_user)):
    """Delete a health goal"""
    if not user:
        raise HTTPException(status_code=401, detail="Connexion requise")
    
    result = await db.health_goals.update_one(
        {"id": goal_id, "user_id": user.user_id},
        {"$set": {"is_active": False}}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Objectif non trouvé")
    
    return {"message": "Objectif supprimé"}

@api_router.post("/goals/check-product/{barcode}")
async def check_product_against_goals(barcode: str, user: User = Depends(get_current_user)):
    """Check if a product aligns with user's health goals"""
    if not user:
        return {"alerts": [], "recommendations": []}
    
    goals = await db.health_goals.find({"user_id": user.user_id, "is_active": True}).to_list(10)
    if not goals:
        return {"alerts": [], "recommendations": []}
    
    # Fetch product
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(f"https://world.openfoodfacts.org/api/v0/product/{barcode}.json")
            data = response.json()
            if data.get('status') != 1:
                return {"alerts": [], "recommendations": []}
            
            product = data.get('product', {})
            nutrients = product.get('nutriments', {})
            additives = product.get('additives_tags', [])
            
            alerts = []
            recommendations = []
            
            for goal in goals:
                goal_type = goal.get('goal_type')
                
                if goal_type == "reduce_sugar":
                    sugars = nutrients.get('sugars_100g', 0) or 0
                    if sugars > 10:
                        alerts.append({"goal": "Réduire le sucre", "message": f"Ce produit contient {sugars}g de sucre/100g", "severity": "high" if sugars > 20 else "medium"})
                
                elif goal_type == "reduce_salt":
                    salt = nutrients.get('salt_100g', 0) or 0
                    if salt > 1:
                        alerts.append({"goal": "Réduire le sel", "message": f"Ce produit contient {salt}g de sel/100g", "severity": "high" if salt > 1.5 else "medium"})
                
                elif goal_type == "reduce_fat":
                    sat_fat = nutrients.get('saturated-fat_100g', 0) or 0
                    if sat_fat > 5:
                        alerts.append({"goal": "Réduire les graisses", "message": f"Ce produit contient {sat_fat}g de graisses saturées/100g", "severity": "high" if sat_fat > 10 else "medium"})
                
                elif goal_type == "avoid_additives":
                    risky_additives = [a for a in additives if a.replace('en:', '').lower() in ['e250', 'e251', 'e252', 'e320', 'e321', 'e951', 'e171']]
                    if risky_additives:
                        alerts.append({"goal": "Éviter les additifs", "message": f"Contient des additifs à risque: {', '.join(risky_additives)}", "severity": "high"})
                
                elif goal_type == "increase_fiber":
                    fiber = nutrients.get('fiber_100g', 0) or 0
                    if fiber >= 5:
                        recommendations.append({"goal": "Augmenter les fibres", "message": f"Bonne source de fibres ({fiber}g/100g)!", "positive": True})
                
                elif goal_type == "increase_protein":
                    proteins = nutrients.get('proteins_100g', 0) or 0
                    if proteins >= 10:
                        recommendations.append({"goal": "Augmenter les protéines", "message": f"Riche en protéines ({proteins}g/100g)!", "positive": True})
            
            return {"alerts": alerts, "recommendations": recommendations}
    except Exception as e:
        logger.error(f"Goal check error: {str(e)}")
        return {"alerts": [], "recommendations": []}

# ============== FIND BETTER ALTERNATIVES ==============
@api_router.get("/find-better/{barcode}")
async def find_better_alternatives(barcode: str):
    """Find healthier alternatives for a product based on its category"""
    try:
        async with httpx.AsyncClient(timeout=20.0) as client:
            # First, get the original product to find its category
            response = await client.get(f"https://world.openfoodfacts.org/api/v0/product/{barcode}.json")
            data = response.json()
            
            if data.get('status') != 1:
                raise HTTPException(status_code=404, detail="Produit non trouvé")
            
            original = data.get('product', {})
            original_score = calculate_health_score(original)
            original_name = original.get('product_name', 'Produit')
            
            # Get categories and product name for search
            categories = original.get('categories_tags', [])
            product_name_words = original_name.split()[:2]  # First 2 words
            
            alternatives = []
            
            # Strategy 1: Search by product type (first words of name)
            if product_name_words:
                search_term = ' '.join(product_name_words)
                search_url = f"https://world.openfoodfacts.org/cgi/search.pl?search_terms={search_term}&search_simple=1&action=process&json=1&page_size=30&sort_by=nutriscore_score"
                
                try:
                    search_response = await client.get(search_url)
                    search_data = search_response.json()
                    
                    for p in search_data.get('products', []):
                        p_barcode = p.get('code', '')
                        if p_barcode == barcode:
                            continue
                        
                        p_score = calculate_health_score(p)
                        p_name = p.get('product_name', '')
                        
                        # Only include if better score and has a name
                        if p_score > original_score and p_name:
                            alternatives.append({
                                "barcode": p_barcode,
                                "name": p_name,
                                "brand": p.get('brands', ''),
                                "image_url": p.get('image_url', ''),
                                "health_score": p_score,
                                "nutri_score": p.get('nutriscore_grade', '').upper() or 'N/A',
                                "score_difference": p_score - original_score,
                                "search_term": search_term
                            })
                except Exception as e:
                    logger.error(f"Search error: {e}")
            
            # Strategy 2: Search by main category
            if len(alternatives) < 5 and categories:
                for category in categories[:2]:
                    category_clean = category.replace('en:', '').replace('fr:', '').replace('-', ' ')
                    search_url = f"https://world.openfoodfacts.org/cgi/search.pl?search_terms={category_clean}&search_simple=1&action=process&json=1&page_size=30&sort_by=nutriscore_score"
                    
                    try:
                        search_response = await client.get(search_url)
                        search_data = search_response.json()
                        
                        for p in search_data.get('products', []):
                            p_barcode = p.get('code', '')
                            if p_barcode == barcode:
                                continue
                            
                            # Check if already added
                            if any(a['barcode'] == p_barcode for a in alternatives):
                                continue
                            
                            p_score = calculate_health_score(p)
                            p_name = p.get('product_name', '')
                            
                            if p_score > original_score and p_name:
                                alternatives.append({
                                    "barcode": p_barcode,
                                    "name": p_name,
                                    "brand": p.get('brands', ''),
                                    "image_url": p.get('image_url', ''),
                                    "health_score": p_score,
                                    "nutri_score": p.get('nutriscore_grade', '').upper() or 'N/A',
                                    "score_difference": p_score - original_score,
                                    "search_term": category_clean
                                })
                        
                        if len(alternatives) >= 5:
                            break
                    except:
                        continue
            
            # Sort by score difference (best improvements first) and take top 5
            alternatives = sorted(alternatives, key=lambda x: x['score_difference'], reverse=True)[:5]
            
            return {
                "original": {
                    "barcode": barcode,
                    "name": original_name,
                    "health_score": original_score,
                    "nutri_score": original.get('nutriscore_grade', '').upper() or 'N/A'
                },
                "alternatives": alternatives,
                "message": f"Trouvé {len(alternatives)} alternative(s) plus saine(s)" if alternatives else "Ce produit est déjà un bon choix dans sa catégorie !"
            }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Find better error: {str(e)}")
        raise HTTPException(status_code=500, detail="Erreur lors de la recherche d'alternatives")

# ============== PRODUCT COMPARISON ==============
@api_router.post("/compare")
async def compare_products(barcodes: List[str]):
    """Compare multiple products side by side"""
    if len(barcodes) < 2:
        raise HTTPException(status_code=400, detail="Au moins 2 produits requis")
    if len(barcodes) > 4:
        raise HTTPException(status_code=400, detail="Maximum 4 produits")
    
    products = []
    async with httpx.AsyncClient(timeout=15.0) as client:
        for barcode in barcodes:
            try:
                response = await client.get(f"https://world.openfoodfacts.org/api/v0/product/{barcode}.json")
                data = response.json()
                if data.get('status') == 1:
                    p = data.get('product', {})
                    health_score = calculate_health_score(p)
                    nutrients = extract_nutrients(p)
                    products.append({
                        "barcode": barcode,
                        "name": p.get('product_name', 'Inconnu'),
                        "brand": p.get('brands', ''),
                        "image_url": p.get('image_url', ''),
                        "health_score": health_score,
                        "nutri_score": p.get('nutriscore_grade', '').upper(),
                        "nova_group": p.get('nova_group', 0) or 0,
                        "nutrients": nutrients,
                        "additives_count": len(p.get('additives_tags', [])),
                    })
            except:
                pass
    
    if len(products) < 2:
        raise HTTPException(status_code=404, detail="Impossible de récupérer les produits")
    
    # Determine winner for each category
    comparison = {
        "products": products,
        "best_health_score": max(products, key=lambda x: x['health_score'])['barcode'],
        "best_nutri_score": min(products, key=lambda x: ord(x['nutri_score'][0]) if x['nutri_score'] else ord('Z'))['barcode'],
        "lowest_sugar": min(products, key=lambda x: x['nutrients'].get('sugars', 999))['barcode'],
        "lowest_fat": min(products, key=lambda x: x['nutrients'].get('saturated_fat', 999))['barcode'],
        "lowest_salt": min(products, key=lambda x: x['nutrients'].get('salt', 999))['barcode'],
        "highest_fiber": max(products, key=lambda x: x['nutrients'].get('fiber', 0))['barcode'],
        "highest_protein": max(products, key=lambda x: x['nutrients'].get('proteins', 0))['barcode'],
    }
    
    return comparison

# ============== FAVORITES ==============
@api_router.get("/favorites")
async def get_favorites(request: Request):
    """Get user's favorite products"""
    user = await get_firebase_premium_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Connexion requise. Ajoutez ?email=votre@email.com")
    
    # Try with user_id first, then email
    favorites = await db.favorites.find({"user_id": user.user_id}, {"_id": 0}).sort('created_at', -1).to_list(50)
    if not favorites:
        favorites = await db.favorites.find({"user_id": user.email}, {"_id": 0}).sort('created_at', -1).to_list(50)
    return favorites

@api_router.post("/favorites/{barcode}")
async def add_favorite(barcode: str, request: Request):
    """Add a product to favorites"""
    user = await get_firebase_premium_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Connexion requise")
    
    existing = await db.favorites.find_one({"user_id": user.email, "barcode": barcode})
    if existing:
        return {"message": "Déjà en favoris"}
    
    # Fetch product info
    async with httpx.AsyncClient(timeout=10.0) as client:
        response = await client.get(f"https://world.openfoodfacts.org/api/v0/product/{barcode}.json")
        data = response.json()
        if data.get('status') != 1:
            raise HTTPException(status_code=404, detail="Produit non trouvé")
        
        p = data.get('product', {})
        favorite = {
            "id": str(uuid.uuid4()),
            "user_id": user.email,
            "barcode": barcode,
            "product_name": p.get('product_name', 'Inconnu'),
            "brand": p.get('brands', ''),
            "image_url": p.get('image_url', ''),
            "health_score": calculate_health_score(p),
            "nutri_score": p.get('nutriscore_grade', '').upper(),
            "created_at": datetime.now(timezone.utc)
        }
        await db.favorites.insert_one(favorite)
        favorite_response = favorite.copy()
        if "_id" in favorite_response:
            del favorite_response["_id"]
        return {"message": "Ajouté aux favoris", "favorite": favorite_response}

@api_router.delete("/favorites/{barcode}")
async def remove_favorite(barcode: str, request: Request):
    """Remove a product from favorites"""
    user = await get_firebase_premium_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Connexion requise")
    
    result = await db.favorites.delete_one({"user_id": user.email, "barcode": barcode})
    if result.deleted_count == 0:
        # Try with user_id
        result = await db.favorites.delete_one({"user_id": user.user_id, "barcode": barcode})
    
    return {"message": "Retiré des favoris"}

# Health Goals Endpoints
@api_router.get("/health-goals")
async def get_health_goals(request: Request):
    """Get user's health goals"""
    user = await get_firebase_premium_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Connexion requise")
    
    goals = await db.health_goals.find({"user_id": user.email}, {"_id": 0}).to_list(20)
    return goals

@api_router.post("/health-goals")
async def add_health_goal(request: Request):
    """Add a health goal"""
    user = await get_firebase_premium_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Connexion requise")
    
    body = await request.json()
    goal_type = body.get('type', '')
    goal_name = body.get('name', '')
    
    if not goal_type or not goal_name:
        raise HTTPException(status_code=400, detail="Type et nom requis")
    
    goal = {
        "id": str(uuid.uuid4()),
        "user_id": user.email,
        "type": goal_type,
        "name": goal_name,
        "created_at": datetime.now(timezone.utc)
    }
    await db.health_goals.insert_one(goal)
    goal_copy = goal.copy()
    if "_id" in goal_copy:
        del goal_copy["_id"]
    return {"message": "Objectif ajouté", "goal": goal_copy}

@api_router.delete("/health-goals/{goal_id}")
async def remove_health_goal(goal_id: str, request: Request):
    """Remove a health goal"""
    user = await get_firebase_premium_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Connexion requise")
    
    await db.health_goals.delete_one({"id": goal_id, "user_id": user.email})
    return {"message": "Objectif supprimé"}

# Exercise Recommendations based on Health Goals
EXERCISES_BY_GOAL = {
    "weight_loss": [
        {"name": "Course à pied", "duration": "30 min", "frequency": "3x/semaine", "calories": "~300 kcal", "icon": "walk"},
        {"name": "HIIT", "duration": "20 min", "frequency": "3x/semaine", "calories": "~250 kcal", "icon": "fitness"},
        {"name": "Natation", "duration": "45 min", "frequency": "2x/semaine", "calories": "~400 kcal", "icon": "water"},
        {"name": "Vélo", "duration": "45 min", "frequency": "3x/semaine", "calories": "~350 kcal", "icon": "bicycle"},
    ],
    "muscle_gain": [
        {"name": "Musculation", "duration": "60 min", "frequency": "4x/semaine", "calories": "~200 kcal", "icon": "barbell"},
        {"name": "Pompes & Tractions", "duration": "30 min", "frequency": "3x/semaine", "calories": "~150 kcal", "icon": "fitness"},
        {"name": "Squats & Fentes", "duration": "30 min", "frequency": "3x/semaine", "calories": "~180 kcal", "icon": "body"},
        {"name": "Gainage", "duration": "15 min", "frequency": "Quotidien", "calories": "~50 kcal", "icon": "fitness"},
    ],
    "energy": [
        {"name": "Yoga", "duration": "30 min", "frequency": "Quotidien", "calories": "~100 kcal", "icon": "body"},
        {"name": "Marche rapide", "duration": "30 min", "frequency": "Quotidien", "calories": "~150 kcal", "icon": "walk"},
        {"name": "Étirements", "duration": "15 min", "frequency": "Quotidien", "calories": "~50 kcal", "icon": "body"},
        {"name": "Tai Chi", "duration": "30 min", "frequency": "3x/semaine", "calories": "~120 kcal", "icon": "body"},
    ],
    "heart_health": [
        {"name": "Marche nordique", "duration": "45 min", "frequency": "4x/semaine", "calories": "~280 kcal", "icon": "walk"},
        {"name": "Vélo elliptique", "duration": "30 min", "frequency": "3x/semaine", "calories": "~250 kcal", "icon": "bicycle"},
        {"name": "Natation douce", "duration": "30 min", "frequency": "2x/semaine", "calories": "~200 kcal", "icon": "water"},
        {"name": "Danse", "duration": "45 min", "frequency": "2x/semaine", "calories": "~300 kcal", "icon": "musical-notes"},
    ],
    "stress": [
        {"name": "Méditation", "duration": "15 min", "frequency": "Quotidien", "calories": "~20 kcal", "icon": "leaf"},
        {"name": "Yoga relaxant", "duration": "30 min", "frequency": "3x/semaine", "calories": "~80 kcal", "icon": "body"},
        {"name": "Respiration profonde", "duration": "10 min", "frequency": "2x/jour", "calories": "~10 kcal", "icon": "leaf"},
        {"name": "Promenade nature", "duration": "45 min", "frequency": "2x/semaine", "calories": "~180 kcal", "icon": "leaf"},
    ],
    "digestion": [
        {"name": "Marche après repas", "duration": "15 min", "frequency": "Après chaque repas", "calories": "~50 kcal", "icon": "walk"},
        {"name": "Yoga digestif", "duration": "20 min", "frequency": "Quotidien", "calories": "~60 kcal", "icon": "body"},
        {"name": "Vélo léger", "duration": "30 min", "frequency": "3x/semaine", "calories": "~150 kcal", "icon": "bicycle"},
    ],
    "sleep": [
        {"name": "Yoga du soir", "duration": "20 min", "frequency": "Chaque soir", "calories": "~60 kcal", "icon": "moon"},
        {"name": "Étirements relaxants", "duration": "10 min", "frequency": "Avant le coucher", "calories": "~30 kcal", "icon": "body"},
        {"name": "Marche en soirée", "duration": "20 min", "frequency": "Quotidien", "calories": "~80 kcal", "icon": "walk"},
    ],
    "immunity": [
        {"name": "Course légère", "duration": "30 min", "frequency": "3x/semaine", "calories": "~250 kcal", "icon": "walk"},
        {"name": "Natation", "duration": "30 min", "frequency": "2x/semaine", "calories": "~250 kcal", "icon": "water"},
        {"name": "Yoga", "duration": "30 min", "frequency": "3x/semaine", "calories": "~100 kcal", "icon": "body"},
    ]
}

@api_router.get("/exercises")
async def get_exercises(request: Request):
    """Get exercise recommendations based on user's health goals"""
    user = await get_firebase_premium_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Connexion requise")
    
    # Get user's goals
    goals = await db.health_goals.find({"user_id": user.email}, {"_id": 0}).to_list(20)
    
    exercises = []
    goal_types_seen = set()
    
    for goal in goals:
        goal_type = goal.get('type', '')
        if goal_type in EXERCISES_BY_GOAL and goal_type not in goal_types_seen:
            goal_types_seen.add(goal_type)
            for exercise in EXERCISES_BY_GOAL[goal_type]:
                exercise_copy = exercise.copy()
                exercise_copy['goal_type'] = goal_type
                exercise_copy['goal_name'] = goal.get('name', '')
                exercises.append(exercise_copy)
    
    # If no goals, return general exercises
    if not exercises:
        exercises = [
            {"name": "Marche", "duration": "30 min", "frequency": "Quotidien", "calories": "~150 kcal", "icon": "walk", "goal_type": "general", "goal_name": "Santé générale"},
            {"name": "Yoga", "duration": "20 min", "frequency": "3x/semaine", "calories": "~80 kcal", "icon": "body", "goal_type": "general", "goal_name": "Bien-être"},
            {"name": "Vélo", "duration": "30 min", "frequency": "2x/semaine", "calories": "~200 kcal", "icon": "bicycle", "goal_type": "general", "goal_name": "Cardio"},
        ]
    
    return {"exercises": exercises, "goals_count": len(goals)}

# ============== VOICE TRANSCRIPTION ==============
from fastapi import UploadFile, File
from emergentintegrations.llm.openai import OpenAISpeechToText

@api_router.post("/transcribe")
async def transcribe_audio(audio: UploadFile = File(...)):
    """Transcribe audio to text using OpenAI Whisper via Emergent Integrations"""
    import tempfile
    import os
    
    temp_path = None
    
    try:
        # Read raw bytes from the upload
        audio_bytes = await audio.read()
        
        if len(audio_bytes) < 100:
            logger.error(f"Audio file too small: {len(audio_bytes)} bytes")
            return {"text": "", "success": False, "error": "Audio file too small"}
        
        logger.info(f"Received audio: {len(audio_bytes)} bytes, content_type: {audio.content_type}")
        
        # Write bytes to temp file
        temp_path = f"/tmp/audio_{uuid.uuid4().hex}.m4a"
        with open(temp_path, "wb") as f:
            f.write(audio_bytes)
        
        logger.info(f"Saved audio to {temp_path}")
        
        # Use Emergent Integrations for Whisper STT
        stt = OpenAISpeechToText(api_key=EMERGENT_LLM_KEY)
        
        with open(temp_path, "rb") as audio_file:
            response = await stt.transcribe(
                file=audio_file,
                model="whisper-1",
                language="fr",
                response_format="json"
            )
        
        text = response.text.strip() if response and response.text else ""
        logger.info(f"Transcription OK: '{text[:80] if text else 'empty'}...'")
        return {"text": text, "success": bool(text)}
                    
    except Exception as e:
        logger.error(f"Transcription error: {str(e)}")
        import traceback
        logger.error(traceback.format_exc())
        return {"text": "", "success": False, "error": str(e)}
    finally:
        if temp_path and os.path.exists(temp_path):
            try:
                os.remove(temp_path)
            except:
                pass

# ============== USER PROFILE & PROGRESS TRACKING ==============
class UserHealthProfile(BaseModel):
    sex: str  # 'male' or 'female'
    age: int
    height: float  # in cm
    weight: float  # in kg
    target_weight: float  # in kg
    activity_level: str  # 'sedentary', 'light', 'moderate', 'very'
    goal: str  # 'lose', 'maintain', 'gain'
    bmr: Optional[int] = None  # Basal Metabolic Rate
    tdee: Optional[int] = None  # Total Daily Energy Expenditure
    daily_calories: Optional[int] = None  # Daily calorie target

class WeightEntry(BaseModel):
    date: str
    weight: float

class DailyStatsEntry(BaseModel):
    date: str
    health_score: Optional[int] = None
    calories: Optional[int] = None
    scans: Optional[int] = None

class UserProgressResponse(BaseModel):
    weight_history: List[WeightEntry]
    daily_stats: List[DailyStatsEntry]
    current_weight: Optional[float]
    start_weight: Optional[float]
    weight_change: Optional[float]
    avg_health_score: Optional[int]
    total_scans: int
    calorie_target: Optional[int]

ACTIVITY_MULTIPLIERS = {
    'sedentary': 1.2,
    'light': 1.375,
    'moderate': 1.55,
    'very': 1.725,
}

def calculate_bmr(sex: str, weight: float, height: float, age: int) -> int:
    """Calculate Basal Metabolic Rate using Mifflin-St Jeor equation"""
    if sex == 'male':
        return int(10 * weight + 6.25 * height - 5 * age + 5)
    else:
        return int(10 * weight + 6.25 * height - 5 * age - 161)

def calculate_tdee(bmr: int, activity_level: str) -> int:
    """Calculate Total Daily Energy Expenditure"""
    multiplier = ACTIVITY_MULTIPLIERS.get(activity_level, 1.2)
    return int(bmr * multiplier)

def calculate_calorie_target(tdee: int, goal: str) -> int:
    """Calculate daily calorie target based on goal"""
    if goal == 'lose':
        return tdee - 500  # 500 calorie deficit for weight loss
    elif goal == 'gain':
        return tdee + 300  # 300 calorie surplus for muscle gain
    return tdee  # Maintain


@api_router.post("/user/profile")
async def save_user_profile(request: Request):
    """Save or update user health profile - Premium feature"""
    user = await get_firebase_premium_user(request)
    
    if not user:
        raise HTTPException(status_code=401, detail="Connexion requise")
    
    if user.subscription_type != "premium":
        raise HTTPException(status_code=403, detail="Fonctionnalité Premium requise")
    
    try:
        body = await request.json()
        
        # Validate required fields
        required_fields = ['sex', 'age', 'height', 'weight', 'target_weight', 'activity_level', 'goal']
        for field in required_fields:
            if field not in body:
                raise HTTPException(status_code=400, detail=f"Champ requis manquant: {field}")
        
        # Calculate metabolic values
        bmr = calculate_bmr(body['sex'], float(body['weight']), float(body['height']), int(body['age']))
        tdee = calculate_tdee(bmr, body['activity_level'])
        daily_calories = calculate_calorie_target(tdee, body['goal'])
        
        profile_doc = {
            "user_id": user.email,
            "sex": body['sex'],
            "age": int(body['age']),
            "height": float(body['height']),
            "weight": float(body['weight']),
            "target_weight": float(body['target_weight']),
            "activity_level": body['activity_level'],
            "goal": body['goal'],
            "bmr": bmr,
            "tdee": tdee,
            "daily_calories": daily_calories,
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc),
        }
        
        # Also add this weight to weight history
        weight_entry = {
            "user_id": user.email,
            "date": datetime.now(timezone.utc).strftime('%Y-%m-%d'),
            "weight": float(body['weight']),
            "created_at": datetime.now(timezone.utc),
        }
        
        # Upsert profile
        await db.user_profiles.update_one(
            {"user_id": user.email},
            {"$set": profile_doc},
            upsert=True
        )
        
        # Add weight entry (only if not already exists for today)
        existing_weight = await db.weight_history.find_one({
            "user_id": user.email,
            "date": weight_entry['date']
        })
        if not existing_weight:
            await db.weight_history.insert_one(weight_entry)
        
        logger.info(f"Saved profile for user {user.email}: BMR={bmr}, TDEE={tdee}, calories={daily_calories}")
        
        return {
            "success": True,
            "message": "Profil enregistré avec succès",
            "profile": {
                "bmr": bmr,
                "tdee": tdee,
                "daily_calories": daily_calories,
                "goal": body['goal'],
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error saving profile: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@api_router.get("/user/profile")
async def get_user_profile(request: Request):
    """Get user health profile"""
    user = await get_firebase_premium_user(request)
    
    if not user:
        raise HTTPException(status_code=401, detail="Connexion requise")
    
    profile = await db.user_profiles.find_one({"user_id": user.email}, {"_id": 0})
    
    if not profile:
        return {"profile": None, "exists": False}
    
    return {"profile": profile, "exists": True}


@api_router.post("/user/weight")
async def add_weight_entry(request: Request):
    """Add a weight entry to history"""
    user = await get_firebase_premium_user(request)
    
    if not user:
        raise HTTPException(status_code=401, detail="Connexion requise")
    
    try:
        body = await request.json()
        weight = float(body.get('weight', 0))
        
        if weight < 30 or weight > 300:
            raise HTTPException(status_code=400, detail="Poids invalide (30-300 kg)")
        
        date_str = body.get('date', datetime.now(timezone.utc).strftime('%Y-%m-%d'))
        
        weight_entry = {
            "user_id": user.email,
            "date": date_str,
            "weight": weight,
            "created_at": datetime.now(timezone.utc),
        }
        
        # Upsert to allow updating same day entry
        await db.weight_history.update_one(
            {"user_id": user.email, "date": date_str},
            {"$set": weight_entry},
            upsert=True
        )
        
        # Also update current weight in profile
        await db.user_profiles.update_one(
            {"user_id": user.email},
            {"$set": {"weight": weight, "updated_at": datetime.now(timezone.utc)}}
        )
        
        return {"success": True, "message": f"Poids de {weight} kg enregistré", "date": date_str}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error adding weight: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@api_router.get("/user/progress")
async def get_user_progress(request: Request, days: int = 30):
    """Get user progress data for charts - weight history, health scores, calories"""
    user = await get_firebase_premium_user(request)
    
    if not user:
        raise HTTPException(status_code=401, detail="Connexion requise")
    
    try:
        # Calculate date cutoff
        cutoff_date = (datetime.now(timezone.utc) - timedelta(days=days)).strftime('%Y-%m-%d')
        
        # Get weight history
        weight_history = await db.weight_history.find(
            {"user_id": user.email, "date": {"$gte": cutoff_date}},
            {"_id": 0, "date": 1, "weight": 1}
        ).sort("date", 1).to_list(100)
        
        # Get scan history for health score and calories stats
        scan_history = await db.scan_history.find(
            {"user_id": user.email}
        ).sort("timestamp", -1).limit(200).to_list(200)
        
        # Also try with user_id as user.user_id
        if not scan_history:
            scan_history = await db.scan_history.find({}).sort("timestamp", -1).limit(50).to_list(50)
        
        # Aggregate daily stats from scan history
        daily_stats_map = {}
        for scan in scan_history:
            timestamp = scan.get('timestamp')
            if timestamp:
                if isinstance(timestamp, str):
                    date_str = timestamp[:10]
                else:
                    date_str = timestamp.strftime('%Y-%m-%d')
                
                if date_str >= cutoff_date:
                    if date_str not in daily_stats_map:
                        daily_stats_map[date_str] = {
                            'date': date_str,
                            'health_scores': [],
                            'scans': 0,
                            'calories': 0,
                        }
                    
                    daily_stats_map[date_str]['scans'] += 1
                    if scan.get('health_score'):
                        daily_stats_map[date_str]['health_scores'].append(scan.get('health_score'))
        
        # Convert to list with averaged scores
        daily_stats = []
        for date_str, stats in sorted(daily_stats_map.items()):
            avg_score = int(sum(stats['health_scores']) / len(stats['health_scores'])) if stats['health_scores'] else None
            daily_stats.append({
                'date': date_str,
                'health_score': avg_score,
                'scans': stats['scans'],
                'calories': stats.get('calories', 0),
            })
        
        # Get user profile for calorie target
        profile = await db.user_profiles.find_one({"user_id": user.email}, {"_id": 0})
        
        # Calculate summary stats
        current_weight = weight_history[-1]['weight'] if weight_history else None
        start_weight = weight_history[0]['weight'] if weight_history else None
        weight_change = round(current_weight - start_weight, 1) if current_weight and start_weight else None
        
        recent_scores = [s['health_score'] for s in daily_stats[-7:] if s.get('health_score')]
        avg_health_score = int(sum(recent_scores) / len(recent_scores)) if recent_scores else None
        
        total_scans = sum(s['scans'] for s in daily_stats)
        
        return {
            "weight_history": weight_history,
            "daily_stats": daily_stats,
            "current_weight": current_weight,
            "start_weight": start_weight,
            "weight_change": weight_change,
            "avg_health_score": avg_health_score,
            "total_scans": total_scans,
            "calorie_target": profile.get('daily_calories') if profile else None,
            "profile": profile,
        }
    except Exception as e:
        logger.error(f"Error getting progress: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@api_router.delete("/user/profile")
async def delete_user_profile(request: Request):
    """Delete user health profile and associated data"""
    user = await get_firebase_premium_user(request)
    
    if not user:
        raise HTTPException(status_code=401, detail="Connexion requise")
    
    await db.user_profiles.delete_one({"user_id": user.email})
    await db.weight_history.delete_many({"user_id": user.email})
    
    return {"success": True, "message": "Profil et historique supprimés"}


# ============== PREMIUM RECIPES API ==============

class RecipeIngredient(BaseModel):
    id: str
    name: str
    quantity: float
    unit: str
    category: str

class RecipeStep(BaseModel):
    id: str
    title: str
    description: str
    duration: int  # in minutes
    image: str
    tip: Optional[str] = None
    videoUrl: Optional[str] = None

class Recipe(BaseModel):
    id: str
    title: str
    subtitle: str
    heroImage: str
    videoUrl: str
    prepTime: int  # in minutes
    totalTime: int
    servings: int
    difficulty: str
    healthScore: int
    calories: int
    protein: int
    carbs: int
    tags: List[str]
    ingredients: List[RecipeIngredient]
    steps: List[RecipeStep]
    author: str
    rating: float
    reviews: int

# Mock recipes data (in production, this would come from the database)
PREMIUM_RECIPES = [
    {
        "id": "buddha-bowl-med",
        "title": "Buddha Bowl Mediterraneen",
        "subtitle": "Bowl equilibre aux saveurs du sud",
        "heroImage": "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=800",
        "videoUrl": "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
        "prepTime": 15,
        "totalTime": 35,
        "servings": 2,
        "difficulty": "Facile",
        "healthScore": 92,
        "calories": 485,
        "protein": 18,
        "carbs": 52,
        "tags": ["Vegetarien", "Proteines", "Sans gluten", "Mediterraneen"],
        "ingredients": [
            {"id": "1", "name": "Quinoa", "quantity": 150, "unit": "g", "category": "Cereales"},
            {"id": "2", "name": "Pois chiches", "quantity": 200, "unit": "g", "category": "Legumineuses"},
            {"id": "3", "name": "Avocat", "quantity": 1, "unit": "piece", "category": "Fruits"},
            {"id": "4", "name": "Tomates cerises", "quantity": 150, "unit": "g", "category": "Legumes"},
            {"id": "5", "name": "Concombre", "quantity": 1, "unit": "piece", "category": "Legumes"},
            {"id": "6", "name": "Feta", "quantity": 80, "unit": "g", "category": "Produits laitiers"},
            {"id": "7", "name": "Huile d'olive", "quantity": 2, "unit": "c.a.s", "category": "Matieres grasses"},
            {"id": "8", "name": "Citron", "quantity": 1, "unit": "piece", "category": "Fruits"},
        ],
        "steps": [
            {
                "id": "step1",
                "title": "Preparer le quinoa",
                "description": "Rincez le quinoa sous l'eau froide. Faites cuire dans 2 volumes d'eau salee pendant 15 minutes.",
                "duration": 15,
                "image": "https://images.unsplash.com/photo-1586201375761-83865001e31c?w=400",
                "tip": "Le quinoa est pret quand les grains sont translucides.",
                "videoUrl": "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4"
            },
            {
                "id": "step2",
                "title": "Preparer les legumes",
                "description": "Coupez les tomates cerises en deux. Detaillez le concombre en rondelles. Emincez l'avocat.",
                "duration": 5,
                "image": "https://images.unsplash.com/photo-1540420773420-3366772f4999?w=400",
                "tip": "Arrosez l'avocat de citron pour eviter qu'il ne s'oxyde.",
            },
            {
                "id": "step3",
                "title": "Rôtir les pois chiches",
                "description": "Egouttez les pois chiches. Faites-les rotir a la poele avec un filet d'huile d'olive pendant 8 minutes.",
                "duration": 8,
                "image": "https://images.unsplash.com/photo-1515543237350-b3eea1ec8082?w=400",
                "tip": "Les pois chiches doivent etre dores et croustillants.",
            },
            {
                "id": "step4",
                "title": "Assembler le bowl",
                "description": "Disposez le quinoa au fond du bowl. Ajoutez les legumes, les pois chiches et la feta. Arrosez d'huile d'olive et de jus de citron.",
                "duration": 3,
                "image": "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=400",
                "tip": "Salez et poivrez selon votre gout.",
            }
        ],
        "author": "Chef NutriScan",
        "rating": 4.8,
        "reviews": 234
    },
    {
        "id": "salmon-teriyaki",
        "title": "Saumon Teriyaki",
        "subtitle": "Filet de saumon glace aux saveurs japonaises",
        "heroImage": "https://images.unsplash.com/photo-1467003909585-2f8a72700288?w=800",
        "videoUrl": "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
        "prepTime": 10,
        "totalTime": 25,
        "servings": 2,
        "difficulty": "Moyen",
        "healthScore": 88,
        "calories": 420,
        "protein": 35,
        "carbs": 28,
        "tags": ["Poisson", "Omega-3", "Japonais", "Rapide"],
        "ingredients": [
            {"id": "1", "name": "Filets de saumon", "quantity": 300, "unit": "g", "category": "Poisson"},
            {"id": "2", "name": "Sauce soja", "quantity": 60, "unit": "ml", "category": "Condiments"},
            {"id": "3", "name": "Miel", "quantity": 30, "unit": "ml", "category": "Sucres"},
            {"id": "4", "name": "Riz basmati", "quantity": 200, "unit": "g", "category": "Cereales"},
            {"id": "5", "name": "Brocoli", "quantity": 200, "unit": "g", "category": "Legumes"},
            {"id": "6", "name": "Graines de sesame", "quantity": 10, "unit": "g", "category": "Graines"},
        ],
        "steps": [
            {
                "id": "step1",
                "title": "Preparer la sauce teriyaki",
                "description": "Melangez la sauce soja et le miel dans un bol. Reservez la moitie pour le glacage.",
                "duration": 2,
                "image": "https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=400",
            },
            {
                "id": "step2",
                "title": "Cuire le riz",
                "description": "Rincez le riz et faites-le cuire selon les instructions du paquet pendant 12 minutes.",
                "duration": 12,
                "image": "https://images.unsplash.com/photo-1516684732162-798a0062be99?w=400",
            },
            {
                "id": "step3",
                "title": "Cuire le saumon",
                "description": "Faites chauffer une poele. Saisissez les filets de saumon 4 minutes de chaque cote en les badigeonnant de sauce.",
                "duration": 8,
                "image": "https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?w=400",
                "tip": "Ne retournez le saumon qu'une seule fois pour une belle croute.",
            },
            {
                "id": "step4",
                "title": "Servir",
                "description": "Disposez le riz et le brocoli dans les assiettes. Ajoutez le saumon, nappez de sauce et parsemez de sesame.",
                "duration": 3,
                "image": "https://images.unsplash.com/photo-1467003909585-2f8a72700288?w=400",
            }
        ],
        "author": "Chef NutriScan",
        "rating": 4.9,
        "reviews": 312
    },
    {
        "id": "smoothie-bowl",
        "title": "Smoothie Bowl Tropical",
        "subtitle": "Petit-dejeuner vitamine et colore",
        "heroImage": "https://images.unsplash.com/photo-1511690743698-d9d85f2fbf38?w=800",
        "videoUrl": "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4",
        "prepTime": 10,
        "totalTime": 10,
        "servings": 1,
        "difficulty": "Facile",
        "healthScore": 95,
        "calories": 320,
        "protein": 8,
        "carbs": 58,
        "tags": ["Petit-dejeuner", "Vegan", "Sans gluten", "Fruits"],
        "ingredients": [
            {"id": "1", "name": "Banane congelee", "quantity": 1, "unit": "piece", "category": "Fruits"},
            {"id": "2", "name": "Mangue", "quantity": 100, "unit": "g", "category": "Fruits"},
            {"id": "3", "name": "Lait de coco", "quantity": 150, "unit": "ml", "category": "Boissons"},
            {"id": "4", "name": "Granola", "quantity": 30, "unit": "g", "category": "Cereales"},
            {"id": "5", "name": "Fruits rouges", "quantity": 50, "unit": "g", "category": "Fruits"},
            {"id": "6", "name": "Noix de coco rapee", "quantity": 10, "unit": "g", "category": "Noix"},
        ],
        "steps": [
            {
                "id": "step1",
                "title": "Mixer les fruits",
                "description": "Placez la banane congelee, la mangue et le lait de coco dans un blender. Mixez pendant 2 minutes jusqu'a obtenir une texture epaisse.",
                "duration": 2,
                "image": "https://images.unsplash.com/photo-1638176066666-ffb2f013c7dd?w=400",
                "tip": "Ajoutez moins de lait pour une texture plus epaisse.",
            },
            {
                "id": "step2",
                "title": "Dresser le bowl",
                "description": "Versez le smoothie dans un bol. Ajoutez le granola, les fruits rouges et la noix de coco rapee en decoration.",
                "duration": 3,
                "image": "https://images.unsplash.com/photo-1511690743698-d9d85f2fbf38?w=400",
            }
        ],
        "author": "Chef NutriScan",
        "rating": 4.7,
        "reviews": 189
    }
]


@api_router.get("/recipes")
async def get_all_recipes(request: Request, category: str = None):
    """Get all premium recipes - Premium feature"""
    user = await get_firebase_premium_user(request)
    
    # Allow non-premium users to see recipe list (but not details)
    recipes = PREMIUM_RECIPES
    
    if category:
        recipes = [r for r in recipes if category.lower() in [t.lower() for t in r['tags']]]
    
    # Return simplified list for non-premium users
    if not user or user.subscription_type != "premium":
        return {
            "recipes": [
                {
                    "id": r["id"],
                    "title": r["title"],
                    "subtitle": r["subtitle"],
                    "heroImage": r["heroImage"],
                    "totalTime": r["totalTime"],
                    "difficulty": r["difficulty"],
                    "healthScore": r["healthScore"],
                    "rating": r["rating"],
                    "tags": r["tags"][:2],
                    "isPremiumLocked": True
                }
                for r in recipes
            ],
            "isPremium": False
        }
    
    return {
        "recipes": [
            {
                "id": r["id"],
                "title": r["title"],
                "subtitle": r["subtitle"],
                "heroImage": r["heroImage"],
                "totalTime": r["totalTime"],
                "difficulty": r["difficulty"],
                "healthScore": r["healthScore"],
                "calories": r["calories"],
                "protein": r["protein"],
                "rating": r["rating"],
                "reviews": r["reviews"],
                "tags": r["tags"],
                "isPremiumLocked": False
            }
            for r in recipes
        ],
        "isPremium": True
    }


@api_router.get("/recipes/{recipe_id}")
async def get_recipe_detail(recipe_id: str, request: Request):
    """Get full recipe details - Premium only"""
    user = await get_firebase_premium_user(request)
    
    if not user or user.subscription_type != "premium":
        raise HTTPException(status_code=403, detail="Fonctionnalite Premium requise")
    
    recipe = next((r for r in PREMIUM_RECIPES if r["id"] == recipe_id), None)
    
    if not recipe:
        raise HTTPException(status_code=404, detail="Recette non trouvee")
    
    return recipe


@api_router.post("/recipes/{recipe_id}/favorite")
async def toggle_recipe_favorite(recipe_id: str, request: Request):
    """Add or remove recipe from favorites"""
    user = await get_firebase_premium_user(request)
    
    if not user:
        raise HTTPException(status_code=401, detail="Connexion requise")
    
    # Check if already favorite
    existing = await db.recipe_favorites.find_one({
        "user_id": user.email,
        "recipe_id": recipe_id
    })
    
    if existing:
        await db.recipe_favorites.delete_one({"_id": existing["_id"]})
        return {"success": True, "isFavorite": False, "message": "Recette retiree des favoris"}
    else:
        await db.recipe_favorites.insert_one({
            "user_id": user.email,
            "recipe_id": recipe_id,
            "created_at": datetime.now(timezone.utc)
        })
        return {"success": True, "isFavorite": True, "message": "Recette ajoutee aux favoris"}


@api_router.get("/recipes/favorites/list")
async def get_favorite_recipes(request: Request):
    """Get user's favorite recipes"""
    user = await get_firebase_premium_user(request)
    
    if not user:
        raise HTTPException(status_code=401, detail="Connexion requise")
    
    favorites = await db.recipe_favorites.find(
        {"user_id": user.email}
    ).to_list(100)
    
    favorite_ids = [f["recipe_id"] for f in favorites]
    recipes = [r for r in PREMIUM_RECIPES if r["id"] in favorite_ids]
    
    return {
        "favorites": [
            {
                "id": r["id"],
                "title": r["title"],
                "subtitle": r["subtitle"],
                "heroImage": r["heroImage"],
                "totalTime": r["totalTime"],
                "difficulty": r["difficulty"],
                "healthScore": r["healthScore"],
                "rating": r["rating"],
            }
            for r in recipes
        ]
    }


# Include router and middleware
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
