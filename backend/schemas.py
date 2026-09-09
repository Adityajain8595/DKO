from typing import Any

from pydantic import BaseModel, Field, field_validator


class UserTurn(BaseModel):
    role: str = Field(description="Role in conversation: user or assistant")
    content: str = Field(description="Message text")

class FarmerProfile(BaseModel):
    name: str | None = Field(default=None, description="Farmer's name")
    state: str | None = Field(default=None, description="State of farming operations")
    district: str | None = Field(default=None, description="District or Tehsil")
    crops: str | None = Field(default=None, description="Registered crops, e.g. Wheat, Basmati Rice")
    land: str | None = Field(default=None, description="Landholding size, e.g. 5 acres")
    soil: str | None = Field(default=None, description="Soil classification, e.g. Alluvial Loam")
    irrigation: str | None = Field(default=None, description="Irrigation type, e.g. Tube well with drip line")

    @field_validator("crops", mode="before")
    @classmethod
    def normalize_crops(cls, v: Any) -> str | None:
        if v is None:
            return None
        if isinstance(v, (list, tuple)):
            return ", ".join(str(x) for x in v if str(x).strip())
        return str(v).strip() or None

    @field_validator("land", mode="before")
    @classmethod
    def normalize_land(cls, v: Any) -> str | None:
        if v is None:
            return None
        return str(v).strip() or None

class ChatReq(BaseModel):
    message: str | None = Field(default=None, description="Inquiry text")
    query: str | None = Field(default=None, description="Alternative key for inquiry text")
    image: str | None = Field(default=None, description="Base64 or URL of crop specimen photo")
    profile: FarmerProfile | None = Field(default=None, description="Farmer context profile")
    history: list[UserTurn] | None = Field(default_factory=list, description="Prior conversation turns")
    session_id: str | None = Field(default="default", description="Session identifier")

    def get_query(self) -> str:
        q = (self.message or self.query or "").strip()
        return q if q else "Agricultural assistance"

class TraceItem(BaseModel):
    tool: str = Field(description="Name of the tool or reasoning step")
    input: Any = Field(default=None, description="Input parameters passed to the tool")
    output: Any = Field(default=None, description="Structured or summary output from the tool")

class ChatRes(BaseModel):
    status: str = Field(default="success", description="Execution status")
    response: str = Field(description="Final advisory response text")
    session_title: str | None = Field(default=None, description="Auto-generated title for first turn")
    rewritten_query: str | None = Field(default=None, description="Resolved contextual search query")
    traces: list[TraceItem] = Field(default_factory=list, description="Execution step traces")
    sources: list[str] = Field(default_factory=list, description="Verified source citations")

class SchemeReq(BaseModel):
    query: str = Field(description="Target scheme name or subsidy question")
    state: str | None = Field(default=None, description="State of eligibility")
    profile: FarmerProfile | None = Field(default=None, description="Farmer profile")

class SchemeRes(BaseModel):
    status: str = Field(default="success", description="Status of lookup")
    name: str | None = Field(default=None, description="Official scheme title")
    ministry: str | None = Field(default=None, description="Responsible ministry or department")
    benefits: str | None = Field(default=None, description="Financial or technical benefits")
    eligibility: str | None = Field(default=None, description="Eligibility criteria")
    documents: list[str] = Field(default_factory=list, description="Required documents checklist")
    steps: str | None = Field(default=None, description="Application procedure")
    verification: str | None = Field(default=None, description="Verification authority")
    links: list[str] = Field(default_factory=list, description="Official portal links")
    match_score: float | None = Field(default=1.0, description="Profile alignment score")
    recommendation: str | None = Field(default=None, description="Personalized action recommendation")

class MandiReq(BaseModel):
    crop: str | None = Field(default=None, description="Target agricultural crop")
    commodity: str | None = Field(default=None, description="Commodity alias")
    state: str | None = Field(default=None, description="Target state")
    market: str | None = Field(default=None, description="Specific APMC market name")
    profile: FarmerProfile | None = Field(default=None, description="Farmer profile")
    refresh: bool | None = Field(default=False, description="Bypass server cache")

    def get_crop(self) -> str:
        return (self.crop or self.commodity or "").strip()

class MandiItem(BaseModel):
    id: str | None = Field(default=None, description="Identifier")
    commodity: str | None = Field(default=None, description="Commodity name")
    variety: str | None = Field(default="FAQ Standard", description="Crop variety or grade")
    mandi: str | None = Field(default=None, description="APMC Market Yard name")
    district: str | None = Field(default=None, description="District")
    state: str | None = Field(default=None, description="State")
    modalPrice: float | None = Field(default=None, description="Modal transaction price in Rs/q")
    minPrice: float | None = Field(default=None, description="Minimum price in Rs/q")
    maxPrice: float | None = Field(default=None, description="Maximum price in Rs/q")
    msp: float | None = Field(default=None, description="Government Minimum Support Price if known")
    trend: str | None = Field(default="STABLE", description="Market sentiment trend")
    changePct: float | None = Field(default=0.0, description="Percentage day change")
    lastUpdated: str | None = Field(default="Today", description="Date or freshness indicator")

class MandiRes(BaseModel):
    status: str = Field(default="success", description="Status of market lookup")
    crop: str | None = Field(default=None, description="Primary crop")
    state: str | None = Field(default=None, description="State")
    modal: str | None = Field(default=None, description="Display modal rate string")
    band: str | None = Field(default=None, description="Display price range string")
    trend: str | None = Field(default="STABLE", description="Market trend")
    advice: str | None = Field(default=None, description="Actionable commercial selling advice")
    sources: list[str] = Field(default_factory=list, description="Source citations")
    items: list[MandiItem] = Field(default_factory=list, description="APMC arrivals list")

class HourlyPoint(BaseModel):
    time: str | None = Field(default=None, description="Clock time e.g. 14:00")
    temp: float | None = Field(default=None, description="Temperature in C")
    pop: int | None = Field(default=None, description="Precipitation probability %")
    wind: float | None = Field(default=None, description="Wind speed in km/h")

class DailyPoint(BaseModel):
    day: str | None = Field(default=None, description="Day label e.g. Today, Wed")
    date: str | None = Field(default=None, description="Calendar date")
    condition: str | None = Field(default=None, description="Weather condition label")
    high: float | None = Field(default=None, description="Max temperature in C")
    low: float | None = Field(default=None, description="Min temperature in C")
    rainChance: int | None = Field(default=None, description="Peak rain chance %")
    agriImpact: str | None = Field(default=None, description="Agronomic guidance for the day")

class WeatherReq(BaseModel):
    location: str = Field(description="City, district, or village name")
    profile: FarmerProfile | None = Field(default=None, description="Farmer profile")

class WeatherRes(BaseModel):
    status: str = Field(default="success", description="Status of weather query")
    temp: float | None = Field(default=None, description="Current ambient temperature in C")
    humidity: int | None = Field(default=None, description="Current relative humidity %")
    wind: float | None = Field(default=None, description="Current wind velocity in km/h")
    rain: int | None = Field(default=None, description="Precipitation probability %")
    spray: str | None = Field(default=None, description="Scientific spray window advisory")
    advice: str | None = Field(default=None, description="Irrigation and crop management advice")
    spray_subline: str | None = Field(default=None, description="Brief timing subline for spray")
    irrigation_subline: str | None = Field(default=None, description="Brief timing subline for irrigation")
    spray_badge: str | None = Field(default=None, description="Status badge for spray advisory")
    irrigation_badge: str | None = Field(default=None, description="Status badge for irrigation advisory")
    uv_index: float | None = Field(default=None, description="UV radiation index")
    air_quality_index: int | None = Field(default=None, description="AQI index")
    air_quality_desc: str | None = Field(default=None, description="Air quality category")
    hourly: list[HourlyPoint] = Field(default_factory=list, description="Hourly forecast points")
    daily: list[DailyPoint] = Field(default_factory=list, description="Daily forecast points")

class TitleReq(BaseModel):
    query: str = Field(description="First user turn text")

class TitleRes(BaseModel):
    title: str = Field(description="Concise 3-4 word session title")

class VisionReq(BaseModel):
    image: str = Field(description="Base64 encoded image string or image URL")
    crop: str | None = Field(default=None, description="Crop name if specified by farmer")
    profile: FarmerProfile | None = Field(default=None, description="Farmer profile")

class VisionRes(BaseModel):
    status: str = Field(default="success", description="Status of optical diagnosis")
    finding: str | None = Field(default=None, description="Pest or disease diagnosis")
    pathogen: str | None = Field(default=None, description="Causal biological pathogen or agent")
    symptoms: str | None = Field(default=None, description="Identified tissue damage symptoms")
    ipm: str | None = Field(default=None, description="Immediate scientific IPM steps")
    chemical: str | None = Field(default=None, description="Approved CIBRC chemical options with safe dosages")
    care: str | None = Field(default=None, description="Preventive care and field sanitation")
