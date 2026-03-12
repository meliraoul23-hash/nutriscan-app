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

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

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
    ingredients_text = product_data.get('ingredients_text', '') or product_data.get('ingredients_text_fr', '') or ''
    ingredients_list = []
    
    raw_ingredients = product_data.get('ingredients', [])
    for ing in raw_ingredients[:20]:
        ingredients_list.append({
            'id': ing.get('id', ''),
            'name': ing.get('text', ing.get('id', '').replace('en:', '').replace('fr:', '').replace('-', ' ').title()),
            'percent': ing.get('percent_estimate', 0),
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
    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            response = await client.get(f"https://world.openfoodfacts.org/api/v0/product/{barcode}.json")
            data = response.json()
            
            if data.get('status') != 1:
                return ProductResponse(barcode=barcode, name="Produit non trouvé", brand="", image_url="", health_score=0, nutri_score="", nutri_score_grade="", nova_group=0, additives=[], nutrients={}, categories=[], pro_tip="Scannez un autre produit.", found=False)
            
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
            
            return ProductResponse(
                barcode=barcode, name=product.get('product_name', 'Produit inconnu'),
                brand=product.get('brands', 'Marque inconnue'), image_url=product.get('image_url', ''),
                health_score=health_score, nutri_score=product.get('nutriscore_grade', '').upper(),
                nutri_score_grade=product.get('nutriscore_grade', '').upper(),
                nova_group=product.get('nova_group', 0) or 0, additives=additives, nutrients=nutrients,
                categories=categories, pro_tip=pro_tip, found=True, ingredients_text=ingredients_text,
                ingredients_list=ingredients_list, allergens=allergens, health_risks=health_risks,
                is_vegan=is_vegan, is_vegetarian=is_vegetarian, is_palm_oil_free=is_palm_oil_free
            )
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
    # Check if this product was already scanned recently (within last 5 seconds) to prevent duplicates
    five_seconds_ago = datetime.now(timezone.utc) - timedelta(seconds=5)
    existing = await db.scan_history.find_one({
        "barcode": scan.barcode,
        "timestamp": {"$gte": five_seconds_ago}
    })
    
    if existing:
        return ScanHistory(**{**existing, "id": existing.get("id", str(uuid.uuid4()))})
    
    scan_dict = scan.model_dump()
    scan_obj = ScanHistory(**scan_dict)
    if user:
        scan_obj.user_id = user.user_id
    
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

# ============== SEARCH ROUTES ==============
@api_router.get("/search")
async def search_products(q: str, page: int = 1, page_size: int = 20):
    """Search products in Open Food Facts database"""
    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            response = await client.get(
                "https://world.openfoodfacts.org/cgi/search.pl",
                params={'search_terms': q, 'search_simple': 1, 'action': 'process', 'page': page, 'page_size': page_size, 'json': 1}
            )
            data = response.json()
            
            products = []
            for p in data.get('products', []):
                score = calculate_health_score(p)
                products.append({
                    'barcode': p.get('code', ''),
                    'name': p.get('product_name', 'Inconnu'),
                    'brand': p.get('brands', ''),
                    'image_url': p.get('image_url', ''),
                    'health_score': score,
                    'nutri_score': p.get('nutriscore_grade', '').upper()
                })
            
            return {'products': products, 'count': data.get('count', 0), 'page': page, 'page_size': page_size}
    except Exception as e:
        logger.error(f"Search error: {str(e)}")
        return {'products': [], 'count': 0, 'page': page, 'page_size': page_size}

# ============== RANKINGS ROUTES ==============
@api_router.get("/rankings/{category}")
async def get_rankings(category: str = "all", limit: int = 20):
    """Get top healthy products by category"""
    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            params = {'action': 'process', 'sort_by': 'nutriscore_score', 'page_size': 50, 'json': 1}
            
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
            return products[:limit]
    except Exception as e:
        logger.error(f"Rankings error: {str(e)}")
        return []

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
@api_router.post("/generate-menu")
async def generate_weekly_menu(user: User = Depends(get_current_user)):
    """Generate personalized weekly meal plan using AI"""
    if not user:
        raise HTTPException(status_code=401, detail="Connexion requise")
    
    if user.subscription_type != "premium":
        raise HTTPException(status_code=403, detail="Fonctionnalité Premium requise")
    
    # Get user's scan history for personalization
    scans = await db.scan_history.find({"user_id": user.user_id}).sort('timestamp', -1).limit(20).to_list(20)
    
    products_context = ""
    if scans:
        products_context = "Produits récemment scannés par l'utilisateur:\n"
        for scan in scans[:10]:
            products_context += f"- {scan['product_name']} (Score: {scan['health_score']}/100)\n"
    
    try:
        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=f"menu_{user.user_id}_{datetime.now().strftime('%Y%m%d')}",
            system_message="""Tu es un nutritionniste expert. Génère un menu hebdomadaire sain et équilibré.
            Le menu doit être adapté aux habitudes alimentaires de l'utilisateur tout en proposant des alternatives plus saines.
            Réponds en JSON avec la structure suivante:
            {
                "samedi": {"petit_dejeuner": "...", "dejeuner": "...", "diner": "...", "collation": "..."},
                "dimanche": {...},
                ... (tous les jours jusqu'à vendredi)
                "liste_courses": ["item1", "item2", ...]
            }"""
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
