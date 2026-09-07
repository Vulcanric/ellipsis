from __future__ import annotations

import base64
import os
from dataclasses import dataclass
from typing import Any

from mcp.server.fastmcp import FastMCP
from playwright.async_api import Browser, BrowserContext, Page, async_playwright


@dataclass
class BrowserSession:
    browser: Browser
    context: BrowserContext
    page: Page


class BrowserSessionManager:
    def __init__(self) -> None:
        self.sessions: dict[str, BrowserSession] = {}
        self.playwright = None

    async def start(self, session_id: str, headless: bool = True) -> dict[str, str]:
        if session_id in self.sessions:
            return {"session_id": session_id, "url": self.sessions[session_id].page.url}
        if self.playwright is None:
            self.playwright = await async_playwright().start()
        browser = await self.playwright.chromium.launch(headless=headless)
        context = await browser.new_context()
        page = await context.new_page()
        self.sessions[session_id] = BrowserSession(browser, context, page)
        return {"session_id": session_id, "url": page.url}

    def page(self, session_id: str) -> Page:
        if session_id not in self.sessions:
            raise ValueError(f"Unknown browser session: {session_id}")
        return self.sessions[session_id].page

    async def close(self, session_id: str) -> str:
        session = self.sessions.pop(session_id, None)
        if session is None:
            return "already closed"
        await session.context.close()
        await session.browser.close()
        return "closed"


mcp = FastMCP("ellipsis-browser")
sessions = BrowserSessionManager()


@mcp.tool()
async def start_browser(session_id: str, headless: bool = True) -> dict[str, str]:
    """Create an isolated browser context for one agent run."""
    return await sessions.start(session_id, headless=headless)


@mcp.tool()
async def navigate(session_id: str, url: str) -> dict[str, str]:
    """Navigate the run's browser to a URL and return the final URL and title."""
    page = sessions.page(session_id)
    await page.goto(url, wait_until="domcontentloaded")
    return {"url": page.url, "title": await page.title()}


@mcp.tool()
async def click(session_id: str, selector: str) -> dict[str, str]:
    """Click a CSS selector in the isolated browser session."""
    page = sessions.page(session_id)
    await page.locator(selector).click()
    return {"url": page.url, "title": await page.title()}


@mcp.tool()
async def fill(session_id: str, selector: str, value: str) -> dict[str, str]:
    """Fill a form control without exposing browser objects to the agent layer."""
    page = sessions.page(session_id)
    await page.locator(selector).fill(value)
    return {"selector": selector, "filled": "true"}


@mcp.tool()
async def inspect(session_id: str) -> dict[str, Any]:
    """Return a bounded text snapshot for agent planning."""
    page = sessions.page(session_id)
    text = (await page.locator("body").inner_text())[:12_000]
    return {"url": page.url, "title": await page.title(), "text": text}


@mcp.tool()
async def screenshot(session_id: str) -> str:
    """Capture the current page as base64 PNG for the run artifact store."""
    image = await sessions.page(session_id).screenshot(type="png")
    return base64.b64encode(image).decode("ascii")


@mcp.tool()
async def close_browser(session_id: str) -> str:
    """Close the isolated browser context and release its resources."""
    return await sessions.close(session_id)


if __name__ == "__main__":
    mcp.run(transport=os.getenv("MCP_TRANSPORT", "stdio"))
