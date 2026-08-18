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
        # Usaremos uma viewport padrão
        context = await browser.new_context(viewport={"width": 1280, "height": 1800})
        page = await context.new_page()

        # 1. Tentar acessar a rota admin sem estar logado
        print("Testando acesso anônimo à área admin...")
        await page.goto("http://localhost:8080/admin", wait_until="networkidle")
        await page.screenshot(path=str(SCREENSHOTS / "1_anonymous_admin.png"))
        print(f"URL atual: {page.url}")

        # Se houver um redirecionamento para /auth, o router está funcionando para anônimos
        
        await browser.close()

if __name__ == "__main__":
    asyncio.run(main())
