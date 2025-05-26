import requests

# Configurações
owner = "awilliansd"
repo = "ai-interaction-hub"  # Apenas o nome do repositório
tag = "v1.0.1"  # Tag da release
url = f"https://api.github.com/repos/{owner}/{repo}/releases/tags/{tag}"

# Cabeçalho para aceitar a versão correta da API
headers = {
    "Accept": "application/vnd.github+json",
    # "Authorization": "Bearer SEU_TOKEN_AQUI"  # Descomente se for um repositório privado
}

# Faz a requisição à API
response = requests.get(url, headers=headers)

# Verifica se a requisição foi bem-sucedida
if response.status_code == 200:
    data = response.json()
    if "assets" in data and data["assets"]:
        for asset in data["assets"]:
            print(f"Arquivo: {asset['name']}, Downloads: {asset['download_count']}")
    else:
        print("Nenhum ativo encontrado na release.")
else:
    print(f"Erro na requisição: {response.status_code}")
    print(response.json().get("message", "Detalhes do erro não disponíveis"))