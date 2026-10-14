"""Political lean of news outlets, for the coverage and bias-distribution view.

Ratings are approximate and follow the consensus of public media-bias raters (AllSides, Ad Fontes Media,
Media Bias/Fact Check) for each outlet's news coverage, not its opinion section. Only outlets where those raters
broadly agree are listed. Anything else is estimated by the LLM once, stored in the `outlets` table, and shown
as an estimate. Edit freely: keys are bare domains and match subdomains too (abcnews.go.com, edition.cnn.com).
"""

from typing import Literal

from app.schemas import Lean

# Name shown in the studio, and lean
OUTLETS: dict[str, tuple[str, Lean]] = {
    # Left
    "msnbc.com": ("MSNBC", "left"),
    "huffpost.com": ("HuffPost", "left"),
    "motherjones.com": ("Mother Jones", "left"),
    "thenation.com": ("The Nation", "left"),
    "jacobin.com": ("Jacobin", "left"),
    "democracynow.org": ("Democracy Now!", "left"),
    "theintercept.com": ("The Intercept", "left"),
    "slate.com": ("Slate", "left"),
    "vox.com": ("Vox", "left"),
    "alternet.org": ("AlterNet", "left"),
    "dailykos.com": ("Daily Kos", "left"),
    "rawstory.com": ("Raw Story", "left"),
    "salon.com": ("Salon", "left"),
    "newrepublic.com": ("The New Republic", "left"),
    "thedailybeast.com": ("The Daily Beast", "left"),
    "commondreams.org": ("Common Dreams", "left"),
    "truthout.org": ("Truthout", "left"),
    "theguardian.com": ("The Guardian", "left"),
    # Lean left
    "nytimes.com": ("The New York Times", "lean-left"),
    "washingtonpost.com": ("The Washington Post", "lean-left"),
    "cnn.com": ("CNN", "lean-left"),
    "nbcnews.com": ("NBC News", "lean-left"),
    "cbsnews.com": ("CBS News", "lean-left"),
    "abcnews.go.com": ("ABC News", "lean-left"),
    "npr.org": ("NPR", "lean-left"),
    "politico.com": ("Politico", "lean-left"),
    "time.com": ("Time", "lean-left"),
    "theatlantic.com": ("The Atlantic", "lean-left"),
    "newyorker.com": ("The New Yorker", "lean-left"),
    "latimes.com": ("Los Angeles Times", "lean-left"),
    "bloomberg.com": ("Bloomberg", "lean-left"),
    "usatoday.com": ("USA Today", "lean-left"),
    "nymag.com": ("New York Magazine", "lean-left"),
    "propublica.org": ("ProPublica", "lean-left"),
    "aljazeera.com": ("Al Jazeera", "lean-left"),
    "independent.co.uk": ("The Independent", "lean-left"),
    "economist.com": ("The Economist", "lean-left"),
    "insider.com": ("Insider", "lean-left"),
    "businessinsider.com": ("Business Insider", "lean-left"),
    "pbs.org": ("PBS", "lean-left"),
    "axios.com": ("Axios", "lean-left"),
    # Center
    "reuters.com": ("Reuters", "center"),
    "apnews.com": ("Associated Press", "center"),
    "bbc.com": ("BBC", "center"),
    "bbc.co.uk": ("BBC", "center"),
    "thehill.com": ("The Hill", "center"),
    "wsj.com": ("The Wall Street Journal", "center"),
    "forbes.com": ("Forbes", "center"),
    "marketwatch.com": ("MarketWatch", "center"),
    "newsweek.com": ("Newsweek", "center"),
    "csmonitor.com": ("The Christian Science Monitor", "center"),
    "ft.com": ("Financial Times", "center"),
    "dw.com": ("DW", "center"),
    "france24.com": ("France 24", "center"),
    "afp.com": ("AFP", "center"),
    "cnbc.com": ("CNBC", "center"),
    "upi.com": ("UPI", "center"),
    "factcheck.org": ("FactCheck.org", "center"),
    "news.yahoo.com": ("Yahoo News", "center"),
    # Lean right
    "nypost.com": ("New York Post", "lean-right"),
    "washingtontimes.com": ("The Washington Times", "lean-right"),
    "thedispatch.com": ("The Dispatch", "lean-right"),
    "reason.com": ("Reason", "lean-right"),
    "foxbusiness.com": ("Fox Business", "lean-right"),
    "telegraph.co.uk": ("The Telegraph", "lean-right"),
    "realclearpolitics.com": ("RealClearPolitics", "lean-right"),
    "washingtonexaminer.com": ("Washington Examiner", "lean-right"),
    "thetimes.co.uk": ("The Times", "lean-right"),
    "epochtimes.com": ("The Epoch Times", "lean-right"),
    # Right
    "foxnews.com": ("Fox News", "right"),
    "breitbart.com": ("Breitbart", "right"),
    "dailywire.com": ("The Daily Wire", "right"),
    "theblaze.com": ("TheBlaze", "right"),
    "newsmax.com": ("Newsmax", "right"),
    "oann.com": ("One America News", "right"),
    "thefederalist.com": ("The Federalist", "right"),
    "dailycaller.com": ("The Daily Caller", "right"),
    "townhall.com": ("Townhall", "right"),
    "thegatewaypundit.com": ("The Gateway Pundit", "right"),
    "nationalreview.com": ("National Review", "right"),
    "spectator.org": ("The American Spectator", "right"),
    "freebeacon.com": ("Washington Free Beacon", "right"),
    "pjmedia.com": ("PJ Media", "right"),
    "redstate.com": ("RedState", "right"),
    "westernjournal.com": ("The Western Journal", "right"),
    "dailysignal.com": ("The Daily Signal", "right"),
    "dailymail.co.uk": ("Daily Mail", "right"),
}

# Not news outlets: platforms, reference sites and search engines carry other people's content, so they have no lean
NOT_OUTLETS = (
    "x.com", "twitter.com", "facebook.com", "instagram.com", "youtube.com", "youtu.be", "tiktok.com", "reddit.com",
    "linkedin.com", "threads.net", "wikipedia.org", "wikimedia.org", "google.com", "news.google.com", "bing.com",
    "msn.com", "archive.org", "pinterest.com", "medium.com", "substack.com", "t.me", "whatsapp.com",
)


def _matches(host: str, domain: str) -> bool:
    return host == domain or host.endswith("." + domain)


# Second-level suffixes where the outlet's name sits one label further left (bbc.co.uk, smh.com.au)
_TWO_PART_SUFFIXES = {"co", "com", "org", "net", "ac", "gov", "edu", "ne", "or"}


def outlet_key(host: str) -> str:
    """The domain an outlet is filed under: its entry in OUTLETS when there is one, else its registrable domain,
    so finance.yahoo.com and sg.finance.yahoo.com count as one outlet."""
    host = host.lower().removeprefix("www.")
    # Longest match first, so abcnews.go.com wins over a bare go.com entry
    for domain in sorted(OUTLETS, key=len, reverse=True):
        if _matches(host, domain):
            return domain
    labels = host.split(".")
    keep = 3 if len(labels) >= 3 and len(labels[-1]) == 2 and labels[-2] in _TWO_PART_SUFFIXES else 2
    return ".".join(labels[-keep:])


def is_outlet(host: str) -> bool:
    host = host.lower().removeprefix("www.")
    if not host or "." not in host:
        return False
    # Government, military and university sites report facts but aren't partisan outlets
    if host.endswith((".gov", ".mil", ".edu")) or ".gov." in host or ".ac." in host:
        return False
    return not any(_matches(host, d) for d in NOT_OUTLETS)


def known(host: str) -> tuple[str, Lean] | None:
    return OUTLETS.get(outlet_key(host))


def bucket(lean: Lean | None) -> Literal["left", "center", "right"] | None:
    """The three columns of the distribution bar."""
    if lean in ("left", "lean-left"):
        return "left"
    if lean in ("right", "lean-right"):
        return "right"
    return "center" if lean == "center" else None
