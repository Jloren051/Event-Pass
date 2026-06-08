import mercadopago
import uuid
import json
import uuid
import json

MERCADOPAGO_TOKEN = "APP_USR-4215736688545258-060516-44b2435ec76016486122d16fe0df96b9-1225559296"
sdk = mercadopago.SDK(MERCADOPAGO_TOKEN)

payment_data = {
    "transaction_amount": 0.01,
    "description": "Ingresso de Teste via Script",
    "payment_method_id": "pix",
    "payer": {
        "email": "test_user_123456@testuser.com",
        "first_name": "Test",
        "last_name": "User",
        "identification": {
            "type": "CPF",
            "number": "19119119100"
        },
    }
}

request_options = mercadopago.config.RequestOptions()
request_options.custom_headers = {
    'x-idempotency-key': str(uuid.uuid4())
}

print("ℹ️  Tentando criar um pagamento PIX de teste...")

try:
    payment_result = sdk.payment().create(payment_data, request_options)
    payment_response = payment_result.get("response")

    if payment_result.get("status") in [200, 201]:
        print("\n✅ Pagamento PIX criado com sucesso!")
        print(f"   - ID do Pagamento: {payment_response.get('id')}")
        print(f"   - QR Code (Copia e Cola): {payment_response.get('point_of_interaction', {}).get('transaction_data', {}).get('qr_code')}")
    else:
        print("\n❌ Falha ao criar pagamento PIX.")
        print(f"   - Status Code: {payment_result.get('status')}")
        print("   - Resposta da API:")
        print(json.dumps(payment_response, indent=4))

except Exception as e:
    print(f"\n🚨 Ocorreu uma exceção durante a chamada da API: {e}")