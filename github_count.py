import requests

# Informações do repositório
owner = "awilliansd"
repo = "ai-interaction-hub"

# Opcional: coloque seu token GitHub para evitar limite de rate
# token = "ghp_xxx..."  # substitua pelo seu token se quiser
headers = {
    # "Authorization": f"token {token}"  # descomente se for usar token
    "Accept": "application/vnd.github+json"
}

# URL da API para listar todas as releases
url = f"https://api.github.com/repos/{owner}/{repo}/releases"

print(f"Buscando releases de {owner}/{repo}...\n")

response = requests.get(url, headers=headers)

if response.status_code != 200:
    print(f"Erro ao buscar releases: {response.status_code}")
    print(response.json())
    exit()

releases = response.json()

if not releases:
    print("Nenhuma release encontrada.")
    print("\nVerifique se:")
    print("1. O repositório existe e é público")
    print("2. Existem releases publicadas")
    print("3. O nome do owner/repo está correto")
else:
    print(f"Total de releases encontradas: {len(releases)}\n")
    print("-" * 80)
    
    for release in releases:
        print(f"\nNome: {release['name']}")
        print(f"Tag: {release['tag_name']}")
        print(f"Publicada: {release['published_at']}")
        print(f"Draft: {release['draft']}")
        print(f"Pre-release: {release['prerelease']}")
        
        assets = release.get('assets', [])
        if assets:
            print(f"Assets ({len(assets)}):")
            for asset in assets:
                print(f"  - {asset['name']}: {asset['download_count']} downloads")
        else:
            print("Sem assets")
        
        print("-" * 80)