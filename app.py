import base64
import uuid
import requests
from flask import Flask, jsonify, request
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

# Access Token dyalek
MERCADO_PAGO_ACCESS_TOKEN = "APP_USR-6221693907804258-101816-2ea1aa7aecd8c5004bc6243d5104f7df-299440048"
MERCADO_PAGO_URL = "https://api.mercadopago.com/v1/payments"

payments_db = {}

@app.route('/api/create-pix', methods=['POST'])
def create_pix():
    # Insha' Idempotency Key unique l-kull request
    idempotency_key = str(uuid.uuid4())

    headers = {
        "Authorization": f"Bearer {MERCADO_PAGO_ACCESS_TOKEN}",
        "Content-Type": "application/json",
        "X-Idempotency-Key": idempotency_key
    }

    payload = {
        "transaction_amount": 5.00,
        "description": "Surpresa Digital Interativa ❤️",
        "payment_method_id": "pix",
        "payer": {
            "email": "cliente@email.com",
            "first_name": "Cliente",
            "last_name": "Surpresa"
        }
    }

    try:
        response = requests.post(MERCADO_PAGO_URL, json=payload, headers=headers)
        payment_data = response.json()

        payment_id = payment_data.get("id")

        if not payment_id:
            print("Erro detalhado do Mercado Pago:", payment_data)
            return jsonify({"error": "Erro ao criar Pix no Mercado Pago", "details": payment_data}), 400

        # Extract QR Code Pix
        point_of_interaction = payment_data.get("point_of_interaction", {})
        transaction_data = point_of_interaction.get("transaction_data", {})

        qr_code_base64 = transaction_data.get("qr_code_base64")
        qr_code_copy_paste = transaction_data.get("qr_code")

        payments_db[str(payment_id)] = "PENDING"

        return jsonify({
            "payment_id": str(payment_id),
            "encoded_image": qr_code_base64,
            "payload": qr_code_copy_paste
        })

    except Exception as e:
        print("Erro interno no servidor:", str(e))
        return jsonify({"error": str(e)}), 500


@app.route('/api/check-pix/<payment_id>', methods=['GET'])
def check_pix(payment_id):
    status = payments_db.get(str(payment_id), "PENDING")

    if status == "PENDING":
        headers = {
            "Authorization": f"Bearer {MERCADO_PAGO_ACCESS_TOKEN}"
        }
        try:
            res = requests.get(f"{MERCADO_PAGO_URL}/{payment_id}", headers=headers)
            if res.status_code == 200:
                mp_status = res.json().get("status")
                if mp_status == "approved":
                    payments_db[str(payment_id)] = "PAID"
                    status = "PAID"
        except Exception as e:
            print("Erro ao consultar Mercado Pago:", e)

    return jsonify({"status": status})


if __name__ == '__main__':
    print("🚀 Servidor Python (Mercado Pago) rodando na porta 5000...")
    app.run(port=5000, debug=True)