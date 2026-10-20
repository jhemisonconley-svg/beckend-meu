from flask import Flask, request, jsonify
from flask_cors import CORS
import mercadopago
import uuid

app = Flask(__name__)
CORS(app)  # Permite requisições de qualquer origem (Netlify, Live Server, etc.)

# Banco de dados temporário em memória para salvar as surpresas
surpresas_db = {}

# Configuração do Mercado Pago
# Cole seu Access Token real aqui se tiver, ou deixe o padrão para testar livremente
ACCESS_TOKEN = "SEU_ACCESS_TOKEN_AQUI" 

try:
    sdk = mercadopago.SDK(ACCESS_TOKEN) if ACCESS_TOKEN != "SEU_ACCESS_TOKEN_AQUI" else None
except Exception:
    sdk = None

@app.route('/', methods=['GET'])
def home():
    return jsonify({"status": "online", "message": "API de Surpresas Românticas está rodando!"})

@app.route('/api/create-pix', methods=['POST', 'OPTIONS'])
def create_pix():
    if request.method == 'OPTIONS':
        return jsonify({"status": "ok"}), 200

    try:
        # Modo de Teste Automático: se não houver token real, gera um QR Code fictício para testes
        if not sdk or ACCESS_TOKEN == "SEU_ACCESS_TOKEN_AQUI":
            return jsonify({
                "payment_id": "test_payment_123456",
                "payload": "00020126580014br.gov.bcb.pix...[PIX_DE_TESTE_AUTOMATICO]...",
                "encoded_image": "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
            })

        payment_data = {
            "transaction_amount": 5.00,
            "description": "Surpresa Romântica Personalizada",
            "payment_method_id": "pix",
            "payer": {
                "email": "cliente@email.com",
                "first_name": "Cliente"
            }
        }

        result = sdk.payment().create(payment_data)
        payment = result["response"]

        if "id" in payment:
            pix_data = payment["point_of_interaction"]["transaction_data"]
            return jsonify({
                "payment_id": payment["id"],
                "payload": pix_data["qr_code"],
                "encoded_image": pix_data["qr_code_base64"]
            })
        else:
            return jsonify({"error": "Erro ao gerar PIX com Mercado Pago", "details": payment}), 400

    except Exception as e:
        print("Erro no servidor ao criar PIX:", e)
        return jsonify({"error": str(e)}), 500

@app.route('/api/check-pix/<payment_id>', methods=['GET'])
def check_pix(payment_id):
    try:
        # Aprova automaticamente se for o pagamento de teste
        if payment_id == "test_payment_123456":
            return jsonify({"status": "PAID"})

        if not sdk:
            return jsonify({"status": "PENDING"})

        payment_info = sdk.payment().get(payment_id)
        status = payment_info["response"]["status"]

        if status == "approved":
            return jsonify({"status": "PAID"})
        else:
            return jsonify({"status": "PENDING"})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/save-surprise', methods=['POST'])
def save_surprise():
    try:
        data = request.json
        surprise_id = str(uuid.uuid4())[:8]  # Gera um ID curto de 8 caracteres
        surpresas_db[surprise_id] = data
        return jsonify({"success": True, "id": surprise_id})
    except Exception as e:
        print("Erro ao salvar surpresa:", e)
        return jsonify({"success": False, "error": str(e)}), 500

@app.route('/api/get-surprise/<surprise_id>', methods=['GET'])
def get_surprise(surprise_id):
    surprise = surpresas_db.get(surprise_id)
    if surprise:
        return jsonify({"success": True, "data": surprise})
    return jsonify({"success": False, "error": "Surpresa não encontrada"}), 404

if __name__ == '__main__':
    print("🚀 Servidor Python rodando na porta 5000...")
    app.run(port=5000, debug=True)