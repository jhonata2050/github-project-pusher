import asyncio
from pathlib import Path
from playwright.async_api import async_playwright
import json
import os

SCREENSHOTS = Path("/tmp/browser/security_check/screenshots")
SCREENSHOTS.mkdir(parents=True, exist_ok=True)

async def main():
    async with async_playwright() as playwright:
        browser = await playwright.chromium.launch(headless=True)
        context = await browser.new_context(viewport={"width": 1280, "height": 1800})
        
        # Restaurar sessão
        with open(os.path.expanduser("~/.cache/lovable-auth/session.json")) as f:
            minted = json.load(f)
        
        storage_key = minted["storage_key"]
        session_json = json.dumps(minted["session"])
        cookies = minted["cookies"]
        
        for c in cookies:
            c["url"] = "http://localhost:8080"
        await context.add_cookies(cookies)

        page = await context.new_page()
        
        # Estabelecer origem e injetar localStorage
        await page.goto("http://localhost:8080")
        await page.evaluate(
            f"window.localStorage.setItem({json.dumps(storage_key)}, {json.dumps(session_json)})"
        )

        # 1. Tentar acessar a rota admin como cliente
        print("Testando acesso de CLIENTE à área admin...")
        await page.goto("http://localhost:8080/admin", wait_until="networkidle")
        
        # Esperar um pouco para o roteador e hooks processarem
        await page.wait_for_timeout(2000)
        
        await page.screenshot(path=str(SCREENSHOTS / "2_client_in_admin.png"))
        print(f"URL atual: {page.url}")
        
        # Verificar se o texto "Área restrita" aparece (comportamento esperado)
        restricted_visible = await page.get_by_text("Área restrita").is_visible()
        print(f"Mensagem de 'Área restrita' visível: {restricted_visible}")
        
        # Se não aparecer "Área restrita" e a URL for /admin, temos um problema no front.
        
        await browser.close()

if __name__ == "__main__":
    asyncio.run(main())
