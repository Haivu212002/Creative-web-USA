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

    def open_public(self, page=None, suffix='services.html'):
        page = page or self.page
        page.goto(f'{self.url}/{suffix}')
        page.wait_for_function("document.querySelector('#salon-structured-data') || document.querySelector('#service-structured-data') || document.querySelector('#service-not-found:not([hidden])')")
        return page

    def eager_images(self, page):
        page.evaluate("document.querySelectorAll('img[src]').forEach(image => image.loading = 'eager')")
        page.wait_for_function("Array.from(document.images).filter(image => image.hasAttribute('src')).every(image => image.complete && image.naturalWidth > 0)")

    def open_admin(self, suffix=''):
        self.page.goto(f'{self.url}/admin/{suffix}')
        expect(self.page.locator('.admin-service-row')).to_have_count(len(DATA['services']))


    def next_weekday(self, weekday):
        day = dt.datetime.now(ZoneInfo('America/New_York')).date() + dt.timedelta(days=1)
        while day.weekday() != weekday:
            day += dt.timedelta(days=1)
        return day.isoformat()


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


    def test_home_information_and_mobile_navigation(self):
        page = self.open_public(suffix='index.html')
        expect(page.locator('#main-navigation a')).to_have_count(7)
        expect(page.locator('.service-card')).to_have_count(3)
        expect(page.locator('#contact, #services, #specials, #gifts')).to_have_count(0)
        self.assertIn('A little polish.', page.locator('h1').inner_text())
        self.assertIn('17044', page.locator('[data-full-address]').inner_text())
        expect(page.locator('.footer-contact [data-phone-link]')).to_have_attribute('href', 'tel:+17172484131')
        self.eager_images(page)
        page.screenshot(path=str(RESULTS / 'website-desktop.png'), full_page=True)
        for width in [1440, 1024, 768, 390, 320]:
            page.set_viewport_size({'width': width, 'height': 844})
            self.assertLessEqual(page.evaluate('document.documentElement.scrollWidth'), width)
        page.set_viewport_size({'width': 390, 'height': 844})
        page.screenshot(path=str(RESULTS / 'website-mobile.png'), full_page=True)
        page.locator('.menu-toggle').click()
        expect(page.locator('.menu-toggle')).to_have_attribute('aria-expanded', 'true')
        with page.expect_navigation(wait_until='domcontentloaded') as navigation:
            page.locator('#main-navigation a[href="gallery.html"]').click()
        self.assertEqual(navigation.value.status, 200)
        expect(page.locator('body')).to_have_attribute('data-page', 'gallery')
        expect(page.locator('.menu-toggle')).to_have_attribute('aria-expanded', 'false')

    def test_seven_main_menus_load_distinct_documents(self):
        routes = json.loads((ROOT / 'docs/page-routes.json').read_text())
        page = self.open_public(suffix='Creative-web-USA/index.html')
        titles = set()
        for key, file in routes.items():
            with page.expect_navigation(wait_until='domcontentloaded') as navigation:
                page.locator(f'#main-navigation a[href="{file}"]').click()
            self.assertIsNotNone(navigation.value, 'A menu click must request a document, not just change a hash.')
            self.assertEqual(navigation.value.status, 200)
            expect(page).to_have_url(f'{self.url}/Creative-web-USA/{file}')
            expect(page.locator('body')).to_have_attribute('data-page', key)
            expect(page.locator('#main-navigation a[aria-current="page"]')).to_have_attribute('href', file)
            expect(page.locator('h1')).to_have_count(1)
            titles.add(page.title())
            self.assertTrue(all(not href.startswith('#') for href in page.locator('#main-navigation a').evaluate_all('(nodes) => nodes.map(node => node.getAttribute("href"))')))
        self.assertEqual(len(titles), 7)
        page.go_back()
        expect(page.locator('body')).to_have_attribute('data-page', 'gifts')
        page.go_forward()
        expect(page.locator('body')).to_have_attribute('data-page', 'contact')

    def test_each_main_page_is_responsive(self):
        routes = json.loads((ROOT / 'docs/page-routes.json').read_text())
        for key, file in routes.items():
            page = self.open_public(suffix=file)
            for width in [1440, 768, 390, 320]:
                page.set_viewport_size({'width': width, 'height': 844})
                self.assertLessEqual(page.evaluate('document.documentElement.scrollWidth'), width, f'{key} overflows at {width}')
            if key in ['services', 'gallery', 'gifts', 'about', 'contact']:
                page.set_viewport_size({'width': 1440, 'height': 1000})
                self.eager_images(page)
                page.screenshot(path=str(RESULTS / f'page-{key}.png'), full_page=True)

    def test_main_page_navigation_works_without_javascript(self):
        context = self.browser.new_context(java_script_enabled=False, reduced_motion='reduce', viewport={'width': 1440, 'height': 1000})
        try:
            page = context.new_page()
            page.goto(f'{self.url}/Creative-web-USA/index.html')
            for key, file in json.loads((ROOT / 'docs/page-routes.json').read_text()).items():
                with page.expect_navigation(wait_until='domcontentloaded') as navigation:
                    page.locator(f'#main-navigation a[href="{file}"]').click()
                self.assertEqual(navigation.value.status, 200)
                expect(page.locator('body')).to_have_attribute('data-page', key)
                expect(page.locator('h1')).to_be_visible()
        finally:
            context.close()

    def test_services_filter_and_booking_link(self):
        page = self.open_public()
        expect(page.locator('.service-card')).to_have_count(6)
        page.locator('#service-filters [data-filter="nails"]').click()
        expect(page.locator('.service-card')).to_have_count(3)
        page.locator('#service-filters [data-filter="spa"]').click()
        expect(page.locator('.service-card')).to_have_count(2)
        page.get_by_role('link', name='Plan a visit for Waxing', exact=True).click()
        expect(page).to_have_url(f'{self.url}/booking.html?service=waxing')
        expect(page.locator('#visit-service')).to_have_value('waxing')

    def test_gallery_filter_more_and_accessible_lightbox(self):
        page = self.open_public(suffix='gallery.html')
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

    def test_service_photos_open_details_and_prefill_separate_booking_page(self):
        page = self.page
        for service in DATA['services']:
            self.open_public(suffix='Creative-web-USA/services.html')
            page.get_by_role('link', name=f"View details for {service['name']}", exact=True).click()
            expect(page).to_have_url(f"{self.url}/Creative-web-USA/service.html?service={service['id']}")
            expect(page.locator('#service-name')).to_have_text(service['name'])
            expect(page.locator('#service-description')).to_have_text(service['details'])
            expect(page.locator('#service-highlights li')).to_have_count(len(service['highlights'].splitlines()))
            expect(page.locator('#service-price')).to_have_text('Call for pricing')
            self.eager_images(page)
            expect(page.locator('#service-image')).to_have_attribute('src', service['image'])
            expect(page.locator('.detail-phone')).to_have_attribute('href', 'tel:+17172484131')
            page.locator('#service-plan').click()
            expect(page).to_have_url(f"{self.url}/Creative-web-USA/booking.html?service={service['id']}")
            expect(page.locator('#visit-service')).to_have_value(service['id'])

    def test_service_detail_mobile_and_missing_service(self):
        page = self.open_public(suffix='service.html?service=nail-art')
        for width in [1440, 768, 390, 320]:
            page.set_viewport_size({'width': width, 'height': 844})
            self.assertLessEqual(page.evaluate('document.documentElement.scrollWidth'), width)
        page.set_viewport_size({'width': 390, 'height': 844})
        self.eager_images(page)
        page.screenshot(path=str(RESULTS / 'service-mobile.png'), full_page=True)
        page.locator('.menu-toggle').click()
        page.locator('#main-navigation a[href="services.html"]').click()
        expect(page.locator('#service-grid')).to_be_visible()
        page.goto(f'{self.url}/service.html?service=missing-service')
        expect(page.locator('#service-not-found')).to_be_visible()
        expect(page.locator('#service-content')).not_to_be_visible()

    def test_service_details_survive_admin_edit_export_and_preview(self):
        self.open_admin('#services')
        page = self.page
        page.get_by_role('button', name='Sửa Manicure', exact=True).click()
        expect(page.locator('#edit-details')).to_have_value(DATA['services'][0]['details'])
        literal = 'Personal manicure details <img src=x onerror="window.hacked=true">'
        page.locator('#edit-details').fill(literal)
        page.locator('#edit-highlights').fill('First detail\nSecond detail')
        page.get_by_role('button', name='Lưu bản nháp', exact=True).click()
        expect(page.locator('#editor-dialog')).not_to_be_visible()
        with page.expect_download() as download_info:
            page.locator('#export-button').click()
        exported = json.loads(Path(download_info.value.path()).read_text())
        self.assertEqual(exported['services'][0]['details'], literal)
        preview = self.context.new_page()
        preview.goto(f'{self.url}/services.html?preview=draft')
        preview.get_by_role('link', name='View details for Manicure', exact=True).click()
        expect(preview).to_have_url(f'{self.url}/service.html?service=manicure&preview=draft')
        expect(preview.locator('#preview-banner')).to_be_visible()
        expect(preview.locator('#service-description')).to_have_text(literal)
        expect(preview.locator('#service-highlights li')).to_have_count(2)
        expect(preview.locator('#service-description img')).to_have_count(0)
        self.assertIsNone(preview.evaluate('window.hacked'))
        preview.locator('#service-plan').click()
        expect(preview.locator('#preview-banner')).to_be_visible()
        expect(preview.locator('#visit-service')).to_have_value('manicure')
        published = self.context.new_page()
        published.goto(f'{self.url}/service.html?service=manicure')
        expect(published.locator('#service-description')).to_have_text(DATA['services'][0]['details'])

    def test_legacy_files_and_old_home_bookmarks(self):
        routes = json.loads((ROOT / 'docs/legacy-routes.json').read_text())
        for name, destination in routes.items():
            self.page.goto(f'{self.url}/Creative-web-USA/{name}')
            expect(self.page).to_have_url(f'{self.url}/Creative-web-USA/{destination}')
            expect(self.page.locator('#salon-structured-data')).to_have_count(1)
        for fragment, file in [('services', 'services.html'), ('gallery', 'gallery.html'), ('contact', 'booking.html'), ('gifts', 'gift-certificates.html')]:
            self.page.goto(f'{self.url}/Creative-web-USA/#{fragment}')
            expect(self.page).to_have_url(f'{self.url}/Creative-web-USA/{file}')
        self.page.goto(f'{self.url}/Creative-web-USA/booking.html?service=design')
        expect(self.page.locator('#visit-service')).to_have_value('nail-art')

    def test_preserved_journal_and_privacy_use_the_shared_menu(self):
        for file in ['blog.html', 'journal-nail-care.html', 'journal-choose-your-shape.html', 'journal-first-visit.html', 'privacy.html']:
            page = self.open_public(suffix='Creative-web-USA/'+file)
            expect(page.locator('#main-navigation a')).to_have_count(7)
            expect(page.locator('h1')).to_be_visible()
            if file != 'privacy.html':
                expect(page.locator('img').first).to_be_visible()
        expect(self.page.locator('main')).to_contain_text('does not submit a booking request')

    def test_effects_scroll_progress_and_reduced_motion(self):
        context = self.browser.new_context(viewport={'width': 1366, 'height': 700}, reduced_motion='no-preference')
        try:
            page = context.new_page()
            page.on('pageerror', lambda error: self.errors.append(str(error)))
            page.goto(f'{self.url}/services.html')
            expect(page.locator('.service-card')).to_have_count(6)
            expect(page.locator('html')).to_have_attribute('data-motion', 'full')
            self.assertEqual(page.locator('.page-intro-copy h1').evaluate('(node) => getComputedStyle(node).animationName'), 'enter-up')
            card = page.locator('.service-card').last
            card.scroll_into_view_if_needed()
            expect(card).to_have_class(__import__('re').compile('is-revealed'))
            page.wait_for_function("Number(document.documentElement.style.getPropertyValue('--reading-progress')) > 0")
            expect(page.locator('.site-header')).to_have_class(__import__('re').compile('is-scrolled'))
            expect(page.locator('.back-to-top')).to_be_visible()
            page.locator('.back-to-top').click()
            page.wait_for_function('scrollY < 10')
            page.emulate_media(reduced_motion='reduce')
            expect(page.locator('html')).to_have_attribute('data-motion', 'reduced')
            self.assertEqual(page.locator('.page-intro-copy h1').evaluate('(node) => getComputedStyle(node).animationName'), 'none')
            self.assertTrue(page.locator('.reveal-pending').evaluate_all('(nodes) => nodes.every(node => getComputedStyle(node).opacity === "1")'))
        finally:
            context.close()

    def test_visit_planner_closed_days_and_call_confirmation(self):
        page = self.open_public(suffix='booking.html')
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
        preview.goto(f'{self.url}/services.html?preview=draft')
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
        preview.goto(f'{self.url}/booking.html?preview=draft')
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
