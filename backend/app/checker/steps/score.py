from app.checker.state import CheckState
from app.checker.rules.lexicon import lexicon_manager
from app.checker.rules.tactics import tactics_manager
from app.checker.rules.templates import template_matcher
from app.checker.rules.scoring import calculate_message_score

async def step_score(state: CheckState) -> CheckState:
    """
    Step 3: Scoring
    - Runs lexicon matching and tactics detection
    - Runs template fuzzy similarity
    - Evaluates impersonation
    - Computes 0-100 deterministic risk score and bands
    """
    text = state.redacted_text or ""

    # 1. Lexicon matches
    scam_scores, matched_lexicon = lexicon_manager.match_text(text)
    state.scam_type_scores = scam_scores
    state.matched_lexicon_entries = matched_lexicon

    # 2. Tactics matches
    matched_tactics, _ = tactics_manager.match_tactics(text)
    state.matched_tactics = matched_tactics

    # 3. Known template match
    tpl_ratio, tpl_text, tpl_type = template_matcher.match_known_template(text)
    state.matched_template_ratio = tpl_ratio
    state.matched_template_text = tpl_text

    # 4. Impersonation detection
    text_lower = text.lower()
    for brand in lexicon_manager.lexicons.get("brands", []):
        pass

    # Check brand list from link scanner
    from app.checker.rules.links import link_scanner
    for b in link_scanner.brands:
        b_name = b.get("name", "").lower()
        aliases = [a.lower() for a in b.get("aliases", [])]
        if b_name in text_lower or any(al in text_lower for al in aliases):
            state.impersonated_brand = b.get("name")
            break

    # 5. Compute deterministic score, band, signals, floors
    score, band, signals, floors, no_reports_not_safe = calculate_message_score(state)
    state.score = score
    state.band = band
    state.signals = signals
    state.floors = floors
    state.no_reports_not_safe = no_reports_not_safe

    return state

