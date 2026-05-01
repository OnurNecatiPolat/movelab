from fastapi import APIRouter
from pydantic import BaseModel, Field

from app.core.config import BILLING_PORTAL_URL, BILLING_PROVIDER, BILLING_SUPPORT_EMAIL

router = APIRouter(prefix="/api/billing", tags=["billing"])

PLAN_CATALOG = [
    {
        "id": "starter",
        "name": "Starter",
        "priceLabel": "14 EUR / user / month",
        "audience": "Solo players and coaches",
        "features": [
            "Game review workspace",
            "Momentum and move quality dashboards",
            "PGN and Chess.com imports",
        ],
    },
    {
        "id": "pro",
        "name": "Pro",
        "priceLabel": "39 EUR / seat / month",
        "audience": "Serious training stacks",
        "features": [
            "Team workspace",
            "Shared review queues",
            "Priority engine orchestration",
        ],
    },
    {
        "id": "academy",
        "name": "Academy",
        "priceLabel": "Custom annual plan",
        "audience": "Clubs, schools, academies",
        "features": [
            "Managed onboarding",
            "Role-based access and reporting",
            "Contract billing placeholders",
        ],
    },
]


class CheckoutIntentRequest(BaseModel):
    plan_id: str = Field(min_length=2, max_length=32)
    seats: int = Field(default=1, ge=1, le=200)


@router.get("/catalog")
def catalog():
    return {
        "provider": BILLING_PROVIDER,
        "portalUrl": BILLING_PORTAL_URL or None,
        "supportEmail": BILLING_SUPPORT_EMAIL,
        "plans": PLAN_CATALOG,
        "checkoutStatus": "placeholder",
        "message": "Odeme saglayicisi henuz bagli degil. Checkout akisina hazir iskelet kuruldu.",
    }


@router.post("/checkout-intent")
def checkout_intent(payload: CheckoutIntentRequest):
    return {
        "status": "placeholder",
        "provider": BILLING_PROVIDER,
        "planId": payload.plan_id,
        "seats": payload.seats,
        "message": "Checkout endpoint hazir. Gercek odeme saglayicisi baglantisi sonradan eklenecek.",
    }
