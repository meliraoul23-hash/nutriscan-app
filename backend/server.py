from fastapi import FastAPI, APIRouter, HTTPException
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime
import httpx

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Constants for controversial additives (E-numbers)
CONTROVERSIAL_ADDITIVES = {
    'e171': {'name': 'Titanium dioxide', 'risk': 'high', 'description': 'Potentially harmful nanoparticles'},
    'e250': {'name': 'Sodium nitrite', 'risk': 'high', 'description': 'Linked to cancer risk when heated'},
    'e251': {'name': 'Sodium nitrate', 'risk': 'high', 'description': 'Can form carcinogenic compounds'},
    'e621': {'name': 'MSG', 'risk': 'medium', 'description': 'May cause sensitivity reactions'},
    'e951': {'name': 'Aspartame', 'risk': 'medium', 'description': 'Artificial sweetener, controversial'},
    'e950': {'name': 'Acesulfame K', 'risk': 'medium', 'description': 'Artificial sweetener'},
    'e102': {'name': 'Tartrazine', 'risk': 'medium', 'description': 'May cause hyperactivity'},
    'e110': {'name': 'Sunset Yellow', 'risk': 'medium', 'description': 'May cause hyperactivity'},
    'e129': {'name': 'Allura Red', 'risk': 'medium', 'description': 'May cause hyperactivity'},
    'e133': {'name': 'Brilliant Blue', 'risk': 'low', 'description': 'Artificial coloring'},
    'e150d': {'name': 'Caramel color', 'risk': 'medium', 'description': 'Contains 4-MEI'},
    'e320': {'name': 'BHA', 'risk': 'high', 'description': 'Potential carcinogen'},
    'e321': {'name': 'BHT', 'risk': 'medium', 'description': 'Controversial preservative'},
    'e407': {'name': 'Carrageenan', 'risk': 'medium', 'description': 'May cause inflammation'},
}

# Models
class ScanHistory(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    barcode: str
    product_name: str
    brand: str = ""
    image_url: str = ""
    health_score: int = 0
    nutri_score: str = ""
    timestamp: datetime = Field(default_factory=datetime.utcnow)

class ScanHistoryCreate(BaseModel):
    barcode: str
    product_name: str
    brand: str = ""
    image_url: str = ""
    health_score: int = 0
    nutri_score: str = ""

class HealthRisk(BaseModel):
    title: str
    description: str
    severity: str  # 'high', 'medium', 'low'
    icon: str

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
    # New fields for ingredients and health risks
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

# Helper functions
def calculate_health_score(product_data: dict) -> int:
    """Calculate health score (0-100) based on nutri-score, additives, and NOVA group"""
    score = 50  # Base score
    
    # Nutri-Score contribution (60% weight)
    nutri_score_map = {'a': 100, 'b': 80, 'c': 60, 'd': 40, 'e': 20}
    nutri_grade = product_data.get('nutriscore_grade', 'c').lower()
    nutri_contribution = nutri_score_map.get(nutri_grade, 60) * 0.6
    
    # NOVA group contribution (20% weight)
    # NOVA 1 = best (unprocessed), NOVA 4 = worst (ultra-processed)
    nova_group = product_data.get('nova_group', 3)
    if nova_group:
        nova_map = {1: 100, 2: 75, 3: 50, 4: 25}
        nova_contribution = nova_map.get(nova_group, 50) * 0.2
    else:
        nova_contribution = 50 * 0.2
    
    # Additives penalty (20% weight)
    additives_tags = product_data.get('additives_tags', [])
    additive_penalty = 0
    for additive in additives_tags:
        # Extract e-number from tag (format: en:e621)
        e_number = additive.replace('en:', '').lower()
        if e_number in CONTROVERSIAL_ADDITIVES:
            risk = CONTROVERSIAL_ADDITIVES[e_number]['risk']
            if risk == 'high':
                additive_penalty += 15
            elif risk == 'medium':
                additive_penalty += 8
            else:
                additive_penalty += 3
    
    # Cap additive penalty at 20 points
    additive_penalty = min(additive_penalty, 20)
    additive_contribution = (100 - additive_penalty * 5) * 0.2
    
    # Calculate final score
    score = int(nutri_contribution + nova_contribution + additive_contribution)
    return max(0, min(100, score))

def analyze_additives(product_data: dict) -> List[Dict[str, Any]]:
    """Analyze additives and categorize them by risk level"""
    additives_tags = product_data.get('additives_tags', [])
    additives_info = []
    
    for additive in additives_tags:
        e_number = additive.replace('en:', '').lower()
        if e_number in CONTROVERSIAL_ADDITIVES:
            info = CONTROVERSIAL_ADDITIVES[e_number].copy()
            info['code'] = e_number.upper()
            additives_info.append(info)
        else:
            # Unknown additive - mark as low risk
            additives_info.append({
                'code': e_number.upper(),
                'name': e_number.upper(),
                'risk': 'low',
                'description': 'No specific concerns'
            })
    
    return additives_info

def get_pro_tip(product_data: dict, health_score: int) -> str:
    """Generate a nutrition pro-tip based on product data"""
    nutrients = product_data.get('nutriments', {})
    
    # Check for high fiber
    fiber = nutrients.get('fiber_100g', 0)
    if fiber and fiber > 5:
        return "✨ High in fiber! Great for digestion and helps you feel full longer."
    
    # Check for high protein
    proteins = nutrients.get('proteins_100g', 0)
    if proteins and proteins > 15:
        return "💪 High in protein! Excellent for muscle building and satiety."
    
    # Check for low sugar
    sugars = nutrients.get('sugars_100g', 0)
    if sugars is not None and sugars < 5:
        return "🍃 Low in sugar! A smart choice for blood sugar management."
    
    # Check for high sugar warning
    if sugars and sugars > 20:
        return "⚠️ High sugar content. Consider consuming in moderation."
    
    # Check for saturated fats
    sat_fat = nutrients.get('saturated-fat_100g', 0)
    if sat_fat and sat_fat > 10:
        return "⚠️ High in saturated fats. Limit intake for heart health."
    
    # Generic tips based on score
    if health_score >= 70:
        return "✅ A healthy choice! This product has good nutritional balance."
    elif health_score >= 50:
        return "📊 Moderate nutritional value. Consider balancing with healthier options."
    else:
        return "💡 Consider healthier alternatives in the same category."

def extract_nutrients(product_data: dict) -> Dict[str, Any]:
    """Extract key nutrients from product data"""
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

def extract_ingredients(product_data: dict) -> tuple:
    """Extract ingredients list and text from product data"""
    ingredients_text = product_data.get('ingredients_text', '') or product_data.get('ingredients_text_fr', '') or ''
    ingredients_list = []
    
    raw_ingredients = product_data.get('ingredients', [])
    for ing in raw_ingredients[:20]:  # Limit to 20 ingredients
        ingredients_list.append({
            'id': ing.get('id', ''),
            'name': ing.get('text', ing.get('id', '').replace('en:', '').replace('fr:', '').replace('-', ' ').title()),
            'percent': ing.get('percent_estimate', 0),
            'vegan': ing.get('vegan', 'unknown'),
            'vegetarian': ing.get('vegetarian', 'unknown'),
        })
    
    return ingredients_text, ingredients_list

def extract_allergens(product_data: dict) -> List[str]:
    """Extract allergens from product data"""
    allergens_tags = product_data.get('allergens_tags', [])
    allergen_names = {
        'en:gluten': 'Gluten',
        'en:milk': 'Lait',
        'en:eggs': 'Oeufs',
        'en:nuts': 'Fruits à coque',
        'en:peanuts': 'Arachides',
        'en:soybeans': 'Soja',
        'en:celery': 'Céleri',
        'en:mustard': 'Moutarde',
        'en:sesame-seeds': 'Sésame',
        'en:fish': 'Poisson',
        'en:crustaceans': 'Crustacés',
        'en:molluscs': 'Mollusques',
        'en:lupin': 'Lupin',
        'en:sulphur-dioxide-and-sulphites': 'Sulfites',
    }
    
    allergens = []
    for tag in allergens_tags:
        name = allergen_names.get(tag, tag.replace('en:', '').replace('-', ' ').title())
        allergens.append(name)
    
    return allergens

def analyze_health_risks(product_data: dict, additives: List[Dict], nutrients: Dict) -> List[Dict[str, Any]]:
    """Analyze and return health risks for the product"""
    risks = []
    
    # Check NOVA group (ultra-processed)
    nova_group = product_data.get('nova_group', 0)
    if nova_group == 4:
        risks.append({
            'title': 'Produit ultra-transformé',
            'description': 'Ce produit est classé NOVA 4 (ultra-transformé). La consommation régulière de ces produits est associée à un risque accru de maladies cardiovasculaires, diabète et obésité.',
            'severity': 'high',
            'icon': 'factory'
        })
    elif nova_group == 3:
        risks.append({
            'title': 'Produit transformé',
            'description': 'Ce produit est classé NOVA 3 (transformé). Privilégiez les aliments moins transformés.',
            'severity': 'medium',
            'icon': 'cog'
        })
    
    # Check for high sugar
    sugars = nutrients.get('sugars', 0) or 0
    if sugars > 20:
        risks.append({
            'title': 'Très riche en sucres',
            'description': f'Contient {sugars}g de sucres pour 100g. Une consommation excessive de sucre peut conduire au diabète, à l\'obésité et aux caries dentaires.',
            'severity': 'high',
            'icon': 'cube'
        })
    elif sugars > 10:
        risks.append({
            'title': 'Riche en sucres',
            'description': f'Contient {sugars}g de sucres pour 100g. Modérez votre consommation.',
            'severity': 'medium',
            'icon': 'cube'
        })
    
    # Check for high saturated fats
    sat_fat = nutrients.get('saturated_fat', 0) or 0
    if sat_fat > 10:
        risks.append({
            'title': 'Très riche en graisses saturées',
            'description': f'Contient {sat_fat}g de graisses saturées pour 100g. Peut augmenter le risque de maladies cardiovasculaires.',
            'severity': 'high',
            'icon': 'heart'
        })
    elif sat_fat > 5:
        risks.append({
            'title': 'Riche en graisses saturées',
            'description': f'Contient {sat_fat}g de graisses saturées pour 100g.',
            'severity': 'medium',
            'icon': 'heart'
        })
    
    # Check for high salt
    salt = nutrients.get('salt', 0) or 0
    if salt > 1.5:
        risks.append({
            'title': 'Très riche en sel',
            'description': f'Contient {salt}g de sel pour 100g. L\'excès de sel peut causer de l\'hypertension.',
            'severity': 'high',
            'icon': 'water'
        })
    elif salt > 0.6:
        risks.append({
            'title': 'Riche en sel',
            'description': f'Contient {salt}g de sel pour 100g.',
            'severity': 'medium',
            'icon': 'water'
        })
    
    # Check for high calorie density
    energy = nutrients.get('energy_kcal', 0) or 0
    if energy > 500:
        risks.append({
            'title': 'Très calorique',
            'description': f'Contient {energy} kcal pour 100g. Attention aux portions.',
            'severity': 'medium',
            'icon': 'flame'
        })
    
    # Check for palm oil
    ingredients_analysis = product_data.get('ingredients_analysis_tags', [])
    if 'en:palm-oil' in ingredients_analysis:
        risks.append({
            'title': 'Contient de l\'huile de palme',
            'description': 'L\'huile de palme est riche en graisses saturées et sa production a un impact environnemental important.',
            'severity': 'medium',
            'icon': 'leaf'
        })
    
    # Check for controversial additives
    high_risk_additives = [a for a in additives if a.get('risk') == 'high']
    if high_risk_additives:
        additive_names = ', '.join([a.get('code', '') for a in high_risk_additives[:3]])
        risks.append({
            'title': 'Additifs controversés',
            'description': f'Contient des additifs à éviter: {additive_names}. Ces substances peuvent présenter des risques pour la santé.',
            'severity': 'high',
            'icon': 'flask'
        })
    
    return risks

def check_dietary_info(product_data: dict) -> tuple:
    """Check if product is vegan/vegetarian and palm oil free"""
    analysis = product_data.get('ingredients_analysis_tags', [])
    
    is_vegan = 'en:vegan' in analysis
    is_vegetarian = 'en:vegetarian' in analysis or is_vegan
    is_palm_oil_free = 'en:palm-oil-free' in analysis
    
    return is_vegan, is_vegetarian, is_palm_oil_free

# API Routes
@api_router.get("/")
async def root():
    return {"message": "NutriScan API - Scan, Analyze, Eat Better!"}

@api_router.get("/product/{barcode}", response_model=ProductResponse)
async def get_product(barcode: str):
    """Fetch product information from Open Food Facts and calculate health score"""
    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            response = await client.get(
                f"https://world.openfoodfacts.org/api/v0/product/{barcode}.json"
            )
            data = response.json()
            
            if data.get('status') != 1:
                return ProductResponse(
                    barcode=barcode,
                    name="Product not found",
                    brand="",
                    image_url="",
                    health_score=0,
                    nutri_score="",
                    nutri_score_grade="",
                    nova_group=0,
                    additives=[],
                    nutrients={},
                    categories=[],
                    pro_tip="Scan another product to get nutrition information.",
                    found=False
                )
            
            product = data.get('product', {})
            
            # Calculate health score
            health_score = calculate_health_score(product)
            
            # Analyze additives
            additives = analyze_additives(product)
            
            # Extract nutrients
            nutrients = extract_nutrients(product)
            
            # Get pro tip
            pro_tip = get_pro_tip(product, health_score)
            
            # Extract categories
            categories = product.get('categories_tags', [])[:5]
            categories = [c.replace('en:', '').replace('-', ' ').title() for c in categories]
            
            # Extract ingredients
            ingredients_text, ingredients_list = extract_ingredients(product)
            
            # Extract allergens
            allergens = extract_allergens(product)
            
            # Analyze health risks
            health_risks = analyze_health_risks(product, additives, nutrients)
            
            # Check dietary info
            is_vegan, is_vegetarian, is_palm_oil_free = check_dietary_info(product)
            
            return ProductResponse(
                barcode=barcode,
                name=product.get('product_name', 'Unknown Product'),
                brand=product.get('brands', 'Unknown Brand'),
                image_url=product.get('image_url', ''),
                health_score=health_score,
                nutri_score=product.get('nutriscore_grade', '').upper(),
                nutri_score_grade=product.get('nutriscore_grade', '').upper(),
                nova_group=product.get('nova_group', 0) or 0,
                additives=additives,
                nutrients=nutrients,
                categories=categories,
                pro_tip=pro_tip,
                found=True,
                ingredients_text=ingredients_text,
                ingredients_list=ingredients_list,
                allergens=allergens,
                health_risks=health_risks,
                is_vegan=is_vegan,
                is_vegetarian=is_vegetarian,
                is_palm_oil_free=is_palm_oil_free
            )
            
    except Exception as e:
        logger.error(f"Error fetching product {barcode}: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/alternatives/{barcode}", response_model=List[AlternativeProduct])
async def get_alternatives(barcode: str):
    """Find healthier alternatives in the same category"""
    try:
        # First get the original product to know its category
        async with httpx.AsyncClient(timeout=15.0) as client:
            response = await client.get(
                f"https://world.openfoodfacts.org/api/v0/product/{barcode}.json"
            )
            data = response.json()
            
            if data.get('status') != 1:
                return []
            
            product = data.get('product', {})
            categories = product.get('categories_tags', [])
            
            if not categories:
                return []
            
            # Get the most specific category
            category = categories[-1] if categories else categories[0]
            original_score = calculate_health_score(product)
            
            # Search for products in the same category with better nutri-score
            search_response = await client.get(
                f"https://world.openfoodfacts.org/cgi/search.pl",
                params={
                    'action': 'process',
                    'tagtype_0': 'categories',
                    'tag_contains_0': 'contains',
                    'tag_0': category,
                    'sort_by': 'nutriscore_score',
                    'page_size': 20,
                    'json': 1
                }
            )
            search_data = search_response.json()
            
            alternatives = []
            for p in search_data.get('products', []):
                if p.get('code') == barcode:
                    continue
                
                p_score = calculate_health_score(p)
                
                # Only include if it has a better score and has required data
                if p_score > original_score and p.get('product_name'):
                    alternatives.append(AlternativeProduct(
                        barcode=p.get('code', ''),
                        name=p.get('product_name', 'Unknown'),
                        brand=p.get('brands', 'Unknown'),
                        image_url=p.get('image_url', ''),
                        health_score=p_score,
                        nutri_score=p.get('nutriscore_grade', '').upper()
                    ))
                
                if len(alternatives) >= 3:
                    break
            
            return alternatives
            
    except Exception as e:
        logger.error(f"Error fetching alternatives for {barcode}: {str(e)}")
        return []

@api_router.post("/history", response_model=ScanHistory)
async def save_scan_history(scan: ScanHistoryCreate):
    """Save a product scan to history"""
    try:
        scan_dict = scan.model_dump()
        scan_obj = ScanHistory(**scan_dict)
        await db.scan_history.insert_one(scan_obj.model_dump())
        return scan_obj
    except Exception as e:
        logger.error(f"Error saving scan history: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/history", response_model=List[ScanHistory])
async def get_scan_history(limit: int = 20):
    """Get recent scan history"""
    try:
        scans = await db.scan_history.find().sort('timestamp', -1).limit(limit).to_list(limit)
        return [ScanHistory(**scan) for scan in scans]
    except Exception as e:
        logger.error(f"Error fetching scan history: {str(e)}")
        return []

@api_router.delete("/history/{scan_id}")
async def delete_scan_history(scan_id: str):
    """Delete a scan from history"""
    try:
        result = await db.scan_history.delete_one({"id": scan_id})
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Scan not found")
        return {"message": "Scan deleted successfully"}
    except Exception as e:
        logger.error(f"Error deleting scan: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.delete("/history")
async def clear_scan_history():
    """Clear all scan history"""
    try:
        await db.scan_history.delete_many({})
        return {"message": "History cleared successfully"}
    except Exception as e:
        logger.error(f"Error clearing history: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# Include the router in the main app
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
