"""Functional checks with a real Chromium browser. No live customer data or remote writes."""
import datetime as dt
import functools
import http.server
import json
from pathlib import Path
import shutil
import threading
import unittest
from zoneinfo import ZoneInfo

from playwright.sync_api import sync_playwright, expect

ROOT = Path(__file__).resolve().parents[1]
DATA = json.loads((ROOT / 'content.json').read_text())
RESULTS = ROOT / 'test-results'


class QuietHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *_):
        pass

    def translate_path(self, path):
        # Also exercise a GitHub Pages project base without exposing other folders.
        if path.startswith('/Creative-web-USA/'):
            path = path[len('/Creative-web-USA'):]
        return super().translate_path(path)


class WebsiteTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.original = (ROOT / 'content.json').read_bytes()
        cls.server = http.server.ThreadingHTTPServer(('127.0.0.1', 0), functools.partial(QuietHandler, directory=str(ROOT)))
        threading.Thread(target=cls.server.serve_forever, daemon=True).start()
        cls.url = f'http://127.0.0.1:{cls.server.server_port}'
        cls.playwright = sync_playwright().start()
        cls.browser = cls.playwright.chromium.launch(executable_path=shutil.which('chromium'), headless=True, args=['--no-sandbox', '--disable-dev-shm-usage'])
        RESULTS.mkdir(exist_ok=True)

    @classmethod
    def tearDownClass(cls):
        cls.browser.close()
        cls.playwright.stop()
        cls.server.shutdown()
        cls.server.server_close()
        assert (ROOT / 'content.json').read_bytes() == cls.original, 'Tests must not modify published content.'

    def setUp(self):
        self.errors = []
        self.context = self.browser.new_context(viewport={'width': 1440, 'height': 1000}, reduced_motion='reduce', timezone_id='America/Los_Angeles')
        self.context.on('page', lambda page: page.on('pageerror', lambda error: self.errors.append(str(error))))
        self.page = self.context.new_page()

    def tearDown(self):
        self.context.close()
        self.assertEqual(self.errors, [], 'Browser JavaScript errors')

    def open_public(self, page=None, suffix=''):
        page = page or self.page
        page.goto(f'{self.url}/{suffix}')
        expect(page.locator('.service-card')).to_have_count(len(DATA['services']))
        return page

    def open_admin(self, suffix=''):
        self.page.goto(f'{self.url}/admin/{suffix}')
        expect(self.page.locator('.admin-service-row')).to_have_count(len(DATA['services']))

    def next_weekday(self, weekday):
        day = dt.datetime.now(ZoneInfo('America/New_York')).date() + dt.timedelta(days=1)
        while day.weekday() != weekday:
            day += dt.timedelta(days=1)
        return day.isoformat()

    def test_public_information_images_and_responsive_layout(self):
        page = self.open_public()
        expect(page.locator('#main-navigation a')).to_have_count(7)
        self.assertIn('A little polish.', page.locator('h1').inner_text())
        expect(page.locator('.contact-phone')).to_have_attribute('href', 'tel:+17172484131')
        self.assertIn('17044', page.locator('[data-address]').inner_text())
        structured = json.loads(page.locator('#salon-structured-data').text_content())
        self.assertEqual(structured['telephone'], '+17172484131')
        page.evaluate("document.querySelectorAll('img').forEach(image => image.loading = 'eager')")
        page.wait_for_function("Array.from(document.images).filter(image => image.hasAttribute('src')).every(image => image.complete && image.naturalWidth > 0)")
        page.screenshot(path=str(RESULTS / 'website-desktop.png'), full_page=True)
        for width in [1440, 1024, 768, 390, 320]:
            page.set_viewport_size({'width': width, 'height': 844})
            self.assertLessEqual(page.evaluate('document.documentElement.scrollWidth'), width, f'Horizontal overflow at {width}px')
        page.set_viewport_size({'width': 390, 'height': 844})
        page.screenshot(path=str(RESULTS / 'website-mobile.png'), full_page=True)
        page.locator('.menu-toggle').click()
        expect(page.locator('.menu-toggle')).to_have_attribute('aria-expanded', 'true')
        page.locator('#main-navigation a[href="#gallery"]').click()
        expect(page.locator('.menu-toggle')).to_have_attribute('aria-expanded', 'false')

    def test_service_filters_gallery_and_lightbox(self):
        page = self.open_public()
        page.locator('#service-filters [data-filter="nails"]').click()
        expect(page.locator('.service-card')).to_have_count(3)
        page.locator('#service-filters [data-filter="spa"]').click()
        expect(page.locator('.service-card')).to_have_count(2)
        page.get_by_role('button', name='Plan a visit for Waxing', exact=True).click()
        expect(page.locator('#visit-service')).to_have_value('waxing')
        expect(page.locator('.gallery-item')).to_have_count(8)
        page.locator('#gallery-more').click()
        expect(page.locator('.gallery-item')).to_have_count(len(DATA['gallery']))
        page.locator('#gallery-filters [data-filter="pedicure"]').click()
        expect(page.locator('.gallery-item')).to_have_count(3)
        trigger = page.locator('.gallery-item').first
        trigger.click()
        expect(page.locator('#gallery-dialog')).to_be_visible()
        expect(page.locator('#lightbox-count')).to_have_text('1 / 3')
        page.keyboard.press('ArrowRight')
        expect(page.locator('#lightbox-count')).to_have_text('2 / 3')
        page.keyboard.press('Escape')
        expect(page.locator('#gallery-dialog')).not_to_be_visible()
        expect(trigger).to_be_focused()

    def test_github_pages_project_subpath(self):
        page = self.page
        page.goto(f'{self.url}/Creative-web-USA/')
        expect(page.locator('.service-card')).to_have_count(len(DATA['services']))
        page.locator('.footer-bottom a').click()
        expect(page).to_have_url(f'{self.url}/Creative-web-USA/admin/')
        expect(page.locator('.admin-service-row')).to_have_count(len(DATA['services']))
        expect(page.locator('#studio-status')).not_to_have_class('studio-status is-error')

    def test_visit_planner_closed_days_and_call_confirmation(self):
        page = self.open_public()
        page.locator('#visit-service').select_option('manicure')
        page.locator('#visit-date').fill(self.next_weekday(6))  # Sunday
        expect(page.locator('#visit-time')).to_be_disabled()
        expect(page.locator('#visit-hint')).to_contain_text('closed')
        page.locator('#visit-date').fill(self.next_weekday(1))  # Tuesday
        expect(page.locator('#visit-time')).to_be_enabled()
        self.assertEqual(page.locator('#visit-time option').last.get_attribute('value'), '17:30')
        page.locator('#visit-time').select_option('12:00')
        page.get_by_role('button', name='Prepare my visit').click()
        expect(page.locator('#visit-summary')).to_be_visible()
        expect(page.locator('#visit-summary-text')).to_contain_text('Manicure')
        expect(page.locator('#visit-summary')).to_contain_text('No appointment has been reserved yet.')
        expect(page.locator('#visit-summary a')).to_have_attribute('href', 'tel:+17172484131')
        self.assertEqual(page.evaluate('localStorage.length'), 0)

    def add_test_service(self):
        page = self.page
        page.locator('.studio-nav a[href="#services"]').click()
        page.locator('[data-add="services"]').click()
        page.locator('#edit-name').fill('Test Signature Nails')
        page.locator('#edit-description').fill('A test service for verifying the content workflow.')
        page.locator('#edit-price').fill('42.50')
        page.locator('#edit-duration').fill('45')
        page.get_by_role('button', name='Lưu bản nháp', exact=True).click()
        expect(page.locator('#editor-dialog')).not_to_be_visible()
        expect(page.locator('.admin-service-row')).to_have_count(len(DATA['services']) + 1)

    def test_admin_draft_preview_export_and_public_isolation(self):
        self.open_admin()
        page = self.page
        self.add_test_service()
        page.reload()
        expect(page.locator('.admin-service-row')).to_have_count(len(DATA['services']) + 1)
        with page.expect_download() as download_info:
            page.locator('#export-button').click()
        exported = json.loads(Path(download_info.value.path()).read_text())
        self.assertEqual(exported['services'][-1]['price'], 42.5)
        self.assertEqual(exported['services'][-1]['duration'], 45)
        preview = self.context.new_page()
        preview.goto(f'{self.url}/?preview=draft')
        expect(preview.locator('#preview-banner')).to_be_visible()
        expect(preview.locator('.service-card')).to_have_count(len(DATA['services']) + 1)
        expect(preview.locator('.service-card').last).to_contain_text('$42.50')
        live = self.context.new_page()
        self.open_public(live)
        expect(live.locator('#preview-banner')).not_to_be_visible()
        # Cancellation preserves the row; confirmation deletes only the local draft.
        page.locator('.admin-service-row').last.get_by_role('button', name='Xóa Test Signature Nails').click()
        page.locator('#confirm-no').click()
        expect(page.locator('.admin-service-row')).to_have_count(len(DATA['services']) + 1)
        page.locator('.admin-service-row').last.get_by_role('button', name='Xóa Test Signature Nails').click()
        page.locator('#confirm-yes').click()
        expect(page.locator('.admin-service-row')).to_have_count(len(DATA['services']))

    def test_content_editor_updates_links_hours_and_rejects_bad_import(self):
        self.open_admin('#content')
        page = self.page
        page.locator('#content-contact-phone').fill('+17175550123')
        page.locator('#content-contact-phoneDisplay').fill('(717) 555-0123')
        page.locator('[name="open-2"]').fill('11:00')
        page.locator('[name="close-2"]').fill('17:00')
        page.get_by_role('button', name='Lưu nội dung', exact=True).click()
        expect(page.locator('#studio-status')).to_contain_text('Đã lưu bản nháp')
        preview = self.context.new_page()
        preview.goto(f'{self.url}/?preview=draft')
        expect(preview.locator('.contact-phone')).to_have_attribute('href', 'tel:+17175550123')
        expect(preview.locator('#hours-list')).to_contain_text('11:00 AM')
        before = page.evaluate("localStorage.getItem('fashion-nails.content-draft.v1')")
        invalid = json.loads(json.dumps(DATA))
        invalid['gallery'][0]['src'] = 'javascript:alert(1)'
        page.locator('#import-file').set_input_files({'name': 'bad.json', 'mimeType': 'application/json', 'buffer': json.dumps(invalid).encode()})
        expect(page.locator('#studio-status')).to_contain_text('Không nhập được')
        self.assertEqual(page.evaluate("localStorage.getItem('fashion-nails.content-draft.v1')"), before)

    def test_gallery_upload_promotion_toggle_import_and_literal_text(self):
        self.open_admin('#gallery')
        page = self.page
        page.locator('[data-add="gallery"]').click()
        page.locator('#edit-caption').fill('A new salon photo')
        page.locator('#edit-alt').fill('Test photo of salon nail art')
        page.locator('#edit-src-upload').set_input_files(str(ROOT / 'assets/images/nail-art-jewels.jpg'))
        page.wait_for_function("document.querySelector('#edit-src').value.startsWith('data:image/jpeg;base64,')")
        page.get_by_role('button', name='Lưu bản nháp', exact=True).click()
        expect(page.locator('.admin-photo-card')).to_have_count(len(DATA['gallery']) + 1)
        page.locator('.studio-nav a[href="#promotions"]').click()
        page.get_by_role('button', name='Sửa Nails & Go').click()
        page.locator('#edit-enabled').uncheck()
        page.get_by_role('button', name='Lưu bản nháp', exact=True).click()
        expect(page.locator('.promo-state')).to_have_text('Đang tắt')
        imported = json.loads(json.dumps(DATA))
        literal = '<img src=x onerror="window.hacked=true">'
        imported['hero']['description'] = literal
        page.locator('#import-file').set_input_files({'name': 'content.json', 'mimeType': 'application/json', 'buffer': json.dumps(imported).encode()})
        expect(page.locator('#confirm-dialog')).to_be_visible()
        page.locator('#confirm-yes').click()
        preview = self.context.new_page()
        preview.goto(f'{self.url}/?preview=draft')
        expect(preview.locator('.hero-description')).to_have_text(literal)
        self.assertIsNone(preview.evaluate('window.hacked'))
        expect(preview.locator('.hero-description img')).to_have_count(0)

    def test_admin_mobile_layout_and_concurrent_draft_protection(self):
        self.open_admin()
        page = self.page
        page.set_viewport_size({'width': 390, 'height': 844})
        page.screenshot(path=str(RESULTS / 'admin-mobile.png'), full_page=True)
        for panel in ['overview', 'services', 'gallery', 'promotions', 'content', 'booking']:
            page.locator(f'.studio-nav a[data-panel="{panel}"]').click()
            expect(page.locator(f'#panel-{panel}')).to_be_visible()
            self.assertLessEqual(page.evaluate('document.documentElement.scrollWidth'), 390, f'Admin overflow: {panel}')
        page.set_viewport_size({'width': 1440, 'height': 1000})
        page.locator('.studio-nav a[data-panel="overview"]').click()
        page.screenshot(path=str(RESULTS / 'admin-desktop.png'), full_page=True)
        other = self.context.new_page()
        other.goto(f'{self.url}/admin/#content')
        expect(other.locator('#content-hero-title')).to_be_visible()
        other.locator('#content-hero-title').fill('Edited in another tab')
        other.get_by_role('button', name='Lưu nội dung', exact=True).click()
        expect(page.locator('#studio-status')).to_contain_text('tab khác')
        page.locator('.studio-nav a[href="#services"]').click()
        page.locator('[data-add="services"]').click()
        page.locator('#edit-name').fill('Concurrent edit must be blocked')
        page.get_by_role('button', name='Lưu bản nháp', exact=True).click()
        expect(page.locator('#editor-dialog')).to_be_visible()
        expect(page.locator('#editor-error')).to_contain_text('tab khác')
        self.assertEqual(page.evaluate("JSON.parse(localStorage.getItem('fashion-nails.content-draft.v1')).content.hero.title"), 'Edited in another tab')


if __name__ == '__main__':
    unittest.main(verbosity=2)
