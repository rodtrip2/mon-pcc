"""
Mon PCC — tests de bout en bout (navigateur Chromium, taille téléphone).

Usage : python3 -m http.server 8765 (à la racine du dépôt), puis
        python3 tests/run_tests.py [http://localhost:8765/]
Chaque test démarre d'un navigateur vierge. Le script s'arrête avec un code
d'erreur si un test échoue ou si une page produit une erreur JavaScript.
"""
import io
import json
import sys
import traceback

from playwright.sync_api import sync_playwright
from pypdf import PdfReader

BASE = sys.argv[1] if len(sys.argv) > 1 else 'http://localhost:8765/'
FR = dict(locale='fr-FR', timezone_id='Europe/Paris')
EN = dict(locale='en-GB', timezone_id='Europe/London')
ROUTES = ['#/', '#/demarche', '#/etape/0', '#/etape/6', '#/etape/7', '#/plan', '#/boite-outils', '#/ressources',
          '#/mon-espace-sante', '#/partager', '#/reglages', '#/apropos', '#/confidentialite', '#/crise',
          '#/entretien', '#/versions', '#/professionnels']
TESTS = []


def test(fn):
    TESTS.append(fn)
    return fn


def seed(page, data):
    page.goto(BASE)
    page.evaluate('p => localStorage.setItem("monpcc.v1", p)', json.dumps(
        {'plan': {'version': 1, 'created': '2026-10-01T10:00:00.000Z', 'updated': '2026-10-20T10:00:00.000Z',
                  'contentUpdated': '2026-10-20T10:00:00.000Z', 'data': data}}))
    page.reload()


def wait_until(page, expr, timeout=5000):
    """Attend qu'une expression soit vraie (wait_for_function est bloqué par la CSP stricte du site)."""
    for _ in range(timeout // 100):
        if page.evaluate(expr):
            return
        page.wait_for_timeout(100)
    raise AssertionError('délai dépassé : ' + expr)


def download(page, click):
    with page.expect_download() as dl:
        click()
    return dl.value.path().read_bytes()


@test
def no_errors_on_any_page(ctx, page, errors):
    for opts in (FR, EN):
        c = ctx.browser.new_context(**opts, viewport={'width': 390, 'height': 844})
        p = c.new_page()
        p.on('pageerror', lambda e: errors.append(str(e)))
        seed(p, {'version': 'adulte', 'difficultes': ['x'], 'strategies': {'moi': ['y']}})
        for r in ROUTES:
            p.goto(BASE + r)
            p.wait_for_timeout(150)
        c.close()


@test
def examples_hidden_until_asked(ctx, page, errors):
    page.goto(BASE)
    page.click('[data-act=start][data-v=adulte]')
    page.goto(BASE + '#/etape/3')
    assert page.locator('.chip').count() == 0, 'les exemples doivent être cachés'
    page.click('[data-act=examples]')
    page.click('.chip >> nth=0')
    page.fill('#free-_', 'Avec mes mots')
    page.click('form.free button')
    page.goto(BASE + '#/plan')
    doc = page.inner_text('.doc')
    assert 'Avec mes mots' in doc and 'Le manque de sommeil' in doc


@test
def pdf_and_summary(ctx, page, errors):
    seed(page, {'version': 'adulte', 'coordonnees': {'prenom': 'Léa'}, 'difficultes': ['a'] * 5,
                'soinsEvites': [{'soin': 'Contention', 'raison': 'souvenir'}], 'alternatives': ['Calme'],
                'aide': {'proches': [{'nom': 'Julie', 'tel': '0611111111'}]}})
    page.goto(BASE + '#/plan')
    page.click('[data-act=pdf-save]')
    page.check('input[value=none]')
    pdf = download(page, lambda: page.click('#modal button[value=ok]'))
    assert pdf.startswith(b'%PDF')
    page.click('[data-act=summary-save]')
    page.check('input[value=none]')
    summ = download(page, lambda: page.click('#modal button[value=ok]'))
    reader = PdfReader(io.BytesIO(summ))
    assert len(reader.pages) == 1, 'la synthèse doit tenir sur une page'
    assert 'Contention' in reader.pages[0].extract_text()


@test
def english_version(ctx, page, errors):
    c = ctx.browser.new_context(**EN, viewport={'width': 390, 'height': 844})
    p = c.new_page()
    p.on('pageerror', lambda e: errors.append(str(e)))
    p.goto(BASE)
    assert p.evaluate('document.documentElement.lang') == 'en'
    p.click('[data-act=start][data-v=adulte]')
    p.goto(BASE + '#/etape/2')
    assert 'For what mental health and/or addiction problems do I receive treatment for?' in p.inner_text('.question')
    p.goto(BASE + '#/ressources')
    assert 'United Kingdom' in p.inner_text('.country-line')
    p.click('#menu-btn')
    p.click('[data-act=lang-switch]')
    assert p.evaluate('document.documentElement.lang') == 'fr'
    c.close()


@test
def accessibility_off_by_default(ctx, page, errors):
    page.goto(BASE)
    page.click('[data-act=start][data-v=adulte]')
    page.goto(BASE + '#/etape/6')
    assert page.locator('.tts-btn, .mic-btn, .q-easy').count() == 0, 'options d’accessibilité visibles par défaut'
    assert page.evaluate('document.documentElement.dataset.text') == 'm'
    page.goto(BASE + '#/reglages')
    page.check('[data-act=easy]')
    page.goto(BASE + '#/etape/6')
    assert page.locator('.q-easy').count() == 1


@test
def teen_version(ctx, page, errors):
    page.goto(BASE)
    page.click('[data-act=start][data-v=ado]')
    page.goto(BASE + '#/etape/0')
    assert 'sur 10' in page.inner_text('.step-count')


@test
def protection_and_crisis_screen(ctx, page, errors):
    seed(page, {'version': 'adulte', 'strategies': {'moi': ['Je marche']},
                'boiteOutils': [{'kind': 'citation', 'text': 'Une respiration à la fois.'}]})
    page.goto(BASE + '#/reglages')
    page.fill('[name=c1]', 'abcdef')
    page.fill('[name=c2]', 'abcdef')
    page.click('form[data-act=protect] button')
    page.wait_for_timeout(1500)
    page.click('[data-act=lock-now]')
    assert page.locator('.btn-crisis').count() == 0, 'sans option, pas d’accès sans code'
    page.fill('[name=code]', 'mauvais')
    page.click('form[data-act=unlock] button')
    page.wait_for_selector('.error:not([hidden])')
    page.fill('[name=code]', 'abcdef')
    page.click('form[data-act=unlock] button')
    page.wait_for_timeout(1500)
    page.goto(BASE + '#/reglages')
    page.check('[data-act=crisis-open]')
    page.click('[data-act=lock-now]')
    page.click('.btn-crisis')
    assert 'Je marche' in page.inner_text('.crisis-list')
    raw = page.evaluate('localStorage.getItem("monpcc.v1")')
    assert 'Je marche' not in raw, 'le plan doit rester chiffré'


@test
def toolbox_dialogs(ctx, page, errors):
    page.goto(BASE)
    page.click('[data-act=start][data-v=adulte]')
    page.goto(BASE + '#/boite-outils')
    page.click('[data-act=tb-link-new]')
    page.fill('#tb-url', 'pas un lien')
    page.click('#modal button[value=ok]')
    assert page.is_visible('#tb-url-err')
    page.fill('#tb-url', 'example.org')
    page.click('#modal button[value=ok]')
    page.click('[data-act=tb-quote-new]')
    page.fill('#tb-qtext', 'Une phrase qui m’aide')
    page.click('#modal button[value=ok]')
    wait_until(page, 'document.querySelectorAll(".tbv-cell").length === 2')


@test
def album_with_photos_and_videos(ctx, page, errors):
    png = bytes.fromhex('89504e470d0a1a0a0000000d4948445200000001000000010806000000'
                        '1f15c4890000000d49444154789c6360000002000154a24f5d0000000049454e44ae426082')
    page.goto(BASE)
    page.click('[data-act=start][data-v=adulte]')
    page.goto(BASE + '#/boite-outils')
    page.set_input_files('[data-act=tb-album-new]', files=[
        {'name': 'a.png', 'mimeType': 'image/png', 'buffer': png},
        {'name': 'b.webm', 'mimeType': 'video/webm', 'buffer': b'\x1a\x45\xdf\xa3' + b'\0' * 64}])
    wait_until(page, '(JSON.parse(localStorage.getItem("monpcc.v1") || "{}").plan?.data.boiteOutils || []).length === 1')
    album = page.evaluate('JSON.parse(localStorage.getItem("monpcc.v1")).plan.data.boiteOutils[0]')
    assert album['kind'] == 'album' and [bool(p.get('video')) for p in album['photos']] == [False, True], album
    assert page.locator('.album-ed-th video').count() == 1, 'vidéo visible en mode modification'
    page.click('.edit-float')
    assert page.locator('.album-th video').count() == 1 and page.locator('.album-play').count() == 1
    assert '1 photo, 1 vidéo' in page.inner_text('.tbv-album')
    page.click('.album-th >> nth=1')
    assert page.locator('#lightbox .lb-stage video').count() == 1
    page.click('[data-lb=next]')
    assert page.locator('#lightbox .lb-stage img').count() == 1
    page.click('[data-lb=close]')


@test
def signed_versions(ctx, page, errors):
    seed(page, {'version': 'adulte', 'difficultes': ['Angoisse'],
                'signature': {'signataires': [{'nom': 'Léa', 'role': 'Usagère'}]}})
    page.goto(BASE + '#/etape/13')
    page.click('[data-act=sign]')
    box = page.locator('#sigpad canvas').bounding_box()
    page.mouse.move(box['x'] + 20, box['y'] + 40)
    page.mouse.down()
    page.mouse.move(box['x'] + 150, box['y'] + 80, steps=8)
    page.mouse.up()
    page.click('[data-sig=ok]')
    page.goto(BASE + '#/etape/2')
    page.fill('#free-_', 'Insomnie')
    page.click('form.free button')
    page.wait_for_timeout(500)
    page.goto(BASE + '#/versions')
    assert 'Insomnie' in page.inner_text('.diff-steps')


@test
def changes_between_two_signatures(ctx, page, errors):
    seed(page, {'version': 'adulte', 'difficultes': ['Angoisse'],
                'signature': {'signataires': [{'nom': 'Léa', 'sig': 'data:image/png;base64,iVBORw0KGgo=',
                                               'signedAt': '2026-10-21T10:00:00.000Z'}]}})
    wait_until(page, '(JSON.parse(localStorage.getItem("monpcc.v1")).plan.data.versions || []).length === 1')
    page.goto(BASE + '#/etape/2')
    page.fill('#free-_', 'Insomnie')
    page.click('form.free button')
    page.goto(BASE + '#/etape/13')
    page.click('[data-act=sign]')
    box = page.locator('#sigpad canvas').bounding_box()
    page.mouse.move(box['x'] + 20, box['y'] + 40)
    page.mouse.down()
    page.mouse.move(box['x'] + 150, box['y'] + 80, steps=8)
    page.mouse.up()
    page.click('[data-sig=ok]')
    page.goto(BASE + '#/versions/1')
    assert 'Insomnie' in page.inner_text('.diff-steps')


@test
def appointment_mode_is_temporary(ctx, page, errors):
    page.goto(BASE)
    page.click('[data-act=start][data-v=adulte]')
    page.goto(BASE + '#/entretien')
    page.click('[data-act=talk-toggle]')
    assert page.evaluate('document.documentElement.dataset.text') == 'l'
    page.goto(BASE + '#/plan')
    assert page.is_visible('.talk-bar')
    page.click('.talk-bar [data-act=talk-end]')
    assert page.evaluate('document.documentElement.dataset.text') == 'm'
    page.goto(BASE + '#/entretien')
    page.click('[data-act=talk-toggle]')
    page.reload()
    assert page.evaluate('document.documentElement.dataset.text') == 'm', 'le mode entretien ne doit pas rester'


@test
def review_reminder_with_chosen_date(ctx, page, errors):
    seed(page, {'version': 'adulte', 'difficultes': ['x'], 'signature': {'date': '2026-10-21', 'signataires': []}})
    page.click('[data-act=review-ics]')
    assert page.is_visible('#rem-date')
    assert page.input_value('#rem-date') == '2027-04-21', 'date par défaut : 6 mois après la signature'
    page.fill('#rem-date', '2027-03-15')
    page.fill('#rem-title', 'Relecture')
    ctx.route('https://calendar.google.com/**', lambda r: r.fulfill(body='ok'))  # pas d'accès au réseau en test
    with ctx.expect_page() as popup:
        page.click('[data-rem=google]')
    url = popup.value.url
    assert 'calendar.google.com' in url and 'dates=20270315/20270316' in url and 'text=Relecture' in url, url
    popup.value.close()
    wait_until(page, 'JSON.parse(localStorage.getItem("monpcc.v1")).plan.data.rappel?.date === "2027-03-15"')
    assert '15/03/2027' in page.inner_text('.review') or '15 mars 2027' in page.inner_text('.review')
    page.click('[data-act=review-ics]')
    assert page.input_value('#rem-date') == '2027-03-15', 'la date choisie est gardée'
    ics = download(page, lambda: page.click('[data-rem=ics]')).decode()
    assert 'DTSTART;VALUE=DATE:20270315' in ics and 'SUMMARY:Relecture' in ics


@test
def examples_follow_country(ctx, page, errors):
    def chips(country, version, step):
        page.goto(BASE)
        page.evaluate(f'localStorage.clear(); localStorage.setItem("monpcc.country", "{country}")')
        page.reload()
        page.click(f'[data-act=start][data-v={version}]')
        page.goto(BASE + f'#/etape/{step}')
        for b in page.locator('[data-act=examples]').all():
            b.click()
        return page.inner_text('main')
    fr = chips('FR', 'adulte', 7)
    assert 'CMP de mon secteur' in fr
    be = chips('BE', 'adulte', 7)
    assert 'CMP' not in be and 'Service de santé mentale (SSM) de ma région' in be
    assert 'Je me rends au service de santé mentale (SSM)' in chips('BE', 'adulte', 6)
    ado = chips('GB', 'ado', 6)
    assert 'Childline (0800 1111)' in ado and 'Samaritans' in ado and '3114' not in ado and 'Maison des adolescents' not in ado
    assert '@' not in chips('INT', 'ado', 6)


def main():
    failed = 0
    with sync_playwright() as pw:
        browser = pw.chromium.launch()
        for fn in TESTS:
            errors = []
            ctx = browser.new_context(**FR, viewport={'width': 390, 'height': 844}, accept_downloads=True)
            page = ctx.new_page()
            page.on('pageerror', lambda e, errors=errors: errors.append(str(e)))
            try:
                fn(ctx, page, errors)
                if errors:
                    raise AssertionError('erreurs JavaScript : ' + '; '.join(errors))
                print(f'✓ {fn.__name__}')
            except Exception as exc:
                failed += 1
                print(f'✗ {fn.__name__}')
                traceback.print_exc()
                # Annotation lisible dans le résumé GitHub Actions
                print(f'::error title={fn.__name__}::{type(exc).__name__}: {str(exc)[:300]}'.replace('\n', ' '))
            finally:
                ctx.close()
        browser.close()
    print(f'{len(TESTS) - failed}/{len(TESTS)} tests réussis')
    sys.exit(1 if failed else 0)


if __name__ == '__main__':
    main()
