import requests

# Informações do repositório e release
owner = "awilliansd"
repo = "ai-interaction-hub"
tag = "v1.0.5"
asset_name = "AI.Interaction.Hub.Setup.1.0.5.exe"

# Opcional: coloque seu token GitHub para evitar limite de rate
# token = "ghp_xxx..."  # substitua pelo seu token se quiser
headers = {
    # "Authorization": f"token {token}"  # descomente se for usar token
    "Accept": "application/vnd.github+json"
}

# URL da API para buscar release pelo tag
url = f"https://api.github.com/repos/{owner}/{repo}/releases/tags/{tag}"

response = requests.get(url, headers=headers)
if response.status_code != 200:
    print(f"Erro ao buscar release: {response.status_code}")
    print(response.json())
    exit()

release_data = response.json()
assets = release_data.get("assets", [])

# Busca o asset pelo nome
for asset in assets:
    if asset["name"] == asset_name:
        print(f"Asset: {asset_name}")
        print(f"Downloads: {asset['download_count']}")
        break
else:
    print(f"Asset '{asset_name}' não encontrado na release '{tag}'.")