import asyncio
from playwright.async_api import async_playwright
import os

async def verify_info_block():
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        page = await browser.new_page()

        # Load the app
        await page.goto(f"file://{os.getcwd()}/index.html")

        # Switch to Pages tab
        await page.click("button[data-tab='pages']")
        await page.wait_for_selector("#addPageBtn", state="visible")

        # 1. Create a new page
        await page.click("#addPageBtn")
        await page.wait_for_selector("#editPageTitle")
        await page.fill("#editPageTitle", "Premium Features")

        # 2. Add an Info Block
        await page.click("#addBlockMenuBtn")
        await page.click("button[data-add-block='infoBlock']")

        # 3. Edit the Info Block
        await page.wait_for_selector(".info-card")
        await page.fill(".info-card [data-info-field='title']", "High Speed WiFi")

        # 4. Check if title syncs to header
        header_title = await page.inner_text(".info-card-title-preview")
        print(f"Header title: {header_title}")
        assert "High Speed WiFi" in header_title

        # 5. Test duplication
        await page.click("button[data-info-duplicate='0']")
        cards = await page.query_selector_all(".info-card")
        print(f"Info cards count after duplication: {len(cards)}")
        assert len(cards) == 2

        # 6. Test collapsing
        await page.click("button[data-info-toggle='0']")
        is_collapsed = await page.evaluate("document.querySelector('.info-card').classList.contains('is-collapsed')")
        print(f"Card 1 collapsed: {is_collapsed}")
        assert is_collapsed is True

        # 7. Add content to second card
        await page.fill(".info-card:nth-child(2) [data-info-field='title']", "Private Pool")

        # 8. Check Preview
        preview_frame = page.frame_locator("#previewFrame")

        # Published pages are required for them to show up in the main list
        await page.select_option("#editPageStatus", "published")

        # Wait for preview to update
        await asyncio.sleep(2)

        # In the preview, click the "Premium Features" card
        await preview_frame.locator(".page-card", has_text="Premium Features").first.click()

        # Wait for modal to open in preview
        await preview_frame.locator("#pageModal[open]").wait_for()

        # Check if Info Block content is in the modal
        modal_content = preview_frame.locator("#modalBody")
        await modal_content.locator("text=High Speed WiFi").wait_for()
        await modal_content.locator("text=Private Pool").wait_for()

        # Debug: Print modal content HTML
        inner_html = await modal_content.inner_html()
        print("Modal inner HTML snippet:")
        print(inner_html[:500])

        # Check for icons - they might be SVGs now
        svg_count = await modal_content.locator("svg").count()
        icon_tags_count = await modal_content.locator("i[data-lucide]").count()
        print(f"SVGs in modal: {svg_count}")
        print(f"i tags in modal: {icon_tags_count}")

        assert (svg_count + icon_tags_count) >= 2

        # Take a screenshot
        await page.screenshot(path="verification/info_block_verify.png", full_page=True)
        print("Verification screenshot saved.")

        await browser.close()

if __name__ == "__main__":
    if not os.path.exists("verification"):
        os.makedirs("verification")
    asyncio.run(verify_info_block())
