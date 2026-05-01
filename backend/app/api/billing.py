from fastapi import APIRouter
from pydantic import BaseModel, Field

from app.core.config import BILLING_PORTAL_URL, BILLING_PROVIDER, BILLING_SUPPORT_EMAIL

router = APIRouter(prefix="/api/billing", tags=["billing"])

PLAN_CATALOG = [
    {
        "id": "supporter",
        "name": "Destekçi",
        "priceLabel": "IBAN bekleniyor",
        "audience": "MoveLab'i desteklemek isteyen oyuncular",
        "features": [
            "Gönüllü destek yüzeyi",
            "Kart veya ödeme sağlayıcısı bağlı değil",
            "IBAN eklendiğinde açıklama alanı burada gösterilecek",
        ],
    },
    {
        "id": "coach-support",
        "name": "Koç Desteği",
        "priceLabel": "Yakında",
        "audience": "Antrenörler ve çalışma grupları",
        "features": [
            "Toplu çalışma desteği için bağış notu",
            "Fatura veya abonelik akışı yok",
            "Ödeme yöntemi sonradan bağlanacak",
        ],
    },
    {
        "id": "academy-donation",
        "name": "Kulüp Katkısı",
        "priceLabel": "IBAN sonrası",
        "audience": "Kulüpler ve akademiler",
        "features": [
            "Kurumsal destek notu",
            "Şu an tahsilat yapılmaz",
            "IBAN bilgisi eklenene kadar pasif kalır",
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
        "checkoutStatus": "donation-placeholder",
        "message": "Bagis alani hazir. IBAN bilgisi eklenene kadar tahsilat yapilmaz.",
    }


@router.post("/checkout-intent")
def checkout_intent(payload: CheckoutIntentRequest):
    return {
        "status": "placeholder",
        "provider": BILLING_PROVIDER,
        "planId": payload.plan_id,
        "seats": payload.seats,
        "message": "Bagis alani hazir. IBAN eklenene kadar aktif tahsilat yok.",
    }
