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
    page.wait_for_function('document.querySelectorAll(".tbv-cell").length === 2', timeout=5000)


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
    page.wait_for_function('(JSON.parse(localStorage.getItem("monpcc.v1")).plan.data.versions || []).length === 1', timeout=5000)
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
