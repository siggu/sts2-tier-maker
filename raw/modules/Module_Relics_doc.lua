== Overview ==
This module provides helper functions to display and manage relic information on the wiki.

It queries the <code>Relics</code> [[Special:CargoTables/Relics|Cargo table]] (declared and populated by [[Template:Relic Infobox]]) and defines several <code>mw.ext.VariablesLua</code> variables for use in templates.

== Dependencies ==
* Cargo table <code>Relics</code> — relic metadata for all games, distinguished by the <code>Game</code> field: <code>1</code> (Slay the Spire), <code>2</code> (Slay the Spire 2) or <code>B</code> (Board Game).
* <code>mw.ext.cargo</code> — used to query relic data.
* <code>mw.ext.VariablesLua</code> — used to define variables accessible in wiki templates.
* <code>mw.ext.LuaCache</code> — used to cache navbox data.

== Functions ==
=== <code>p.defineVariables(frame)</code> ===
'''Status:''' currently broken, see [[#Known issues|Known issues]].

'''Purpose:'''

Fetches relic data for the given name and sets several VariablesLua variables for use elsewhere on the page. Returns an empty string and sets nothing if the relic is not found.

'''Usage:'''
<pre>{{#invoke:Relics|defineVariables|RelicName|Game}}</pre>
The second argument defaults to <code>1</code> when omitted. Pass <code>2</code> for Slay the Spire 2 or <code>B</code> for the Board Game. An explicitly empty argument does not fall back to the default and will match no relics.

'''Sets the following variables:'''
{| class="wikitable"
! Variable !! Description
|-
| <code>relic_rarity</code> || Rarity (Starter, Common, Uncommon, Rare, Boss, Ancient, Shop, Event, Blight, Special)
|-
| <code>relic_character</code> || Intended to be the character the relic is exclusive to, or “Any”. Currently always “Any”, see [[#Known issues|Known issues]].
|-
| <code>relic_image</code> || Filename of the relic’s image
|-
| <code>relic_description</code> || The relic’s description (preprocessed wikitext)
|-
| <code>relic_cost</code> || The relic’s cost (Board Game relics only)
|-
| <code>relic_flavor</code> || The relic’s flavor text
|}

'''Example:'''
<pre>{{#invoke:Relics|defineVariables|Anchor}}</pre>
<pre>{{#invoke:Relics|defineVariables|Anchor|2}}</pre>

=== <code>p.getInline(frame)</code> ===
'''Purpose:'''

Displays an inline icon and link to the relic page, suitable for use within sentences or tables.

'''Usage:'''
<pre>{{#invoke:Relics|getInline|RelicName|OptionalLabel|Game|NoIcon}}</pre>
* '''RelicName''' — falls back to the parent template’s first argument if omitted.
* '''OptionalLabel''' — link text; if omitted or empty, the relic name is used.
* '''Game''' — defaults to <code>1</code>; pass <code>2</code> for Slay the Spire 2 or <code>B</code> for the Board Game.
* '''NoIcon''' — pass <code>true</code> to output only the link, without the icon.

The link target comes from the relic’s <code>Link</code> field in Cargo. If the relic is not found, the module outputs <code>ErrorImage.png</code> and a link to the guessed page name, prefixed with <code>Slay the Spire 2:</code> for StS2.

'''Output Example:'''
<pre>[[File:Anchor.png|24px|middle|link=Anchor]] [[Anchor|Anchor]]</pre>
'''Output Example (not found, StS2):'''
<pre>[[File:ErrorImage.png|24px|middle|link=Slay the Spire 2:Anchor]] [[Slay the Spire 2:Anchor|Anchor]]</pre>

=== <code>p.NavBoxQuery(frame)</code> ===
'''Purpose:'''

Builds the Slay the Spire 2 relic navbox lists. It queries all StS2 relics not tagged <code>NoList</code>, sorts them, groups them by category, and defines one VariablesLua variable per group. Each variable holds a <code>\n*</code>-separated list of inline relic links (with <code>relic-trigger</code> popup markup), or an empty string.

'''Usage:'''
<pre>{{#invoke:Relics|NavBoxQuery}}</pre>

'''Variables defined:'''
* Starter relics: <code>IroncladStarter</code>, <code>SilentStarter</code>, <code>RegentStarter</code>, <code>NecrobinderStarter</code>, <code>DefectStarter</code>, <code>WatcherStarter</code>
* Shared rarities: <code>Common</code>, <code>Uncommon</code>, <code>Rare</code>, <code>Boss</code>, <code>Shop</code>, <code>Event</code>, <code>Special</code>
* Character-exclusive rarities: <code>CharCommon</code>, <code>CharUncommon</code>, <code>CharRare</code>, <code>CharBoss</code>, <code>CharShop</code>
* Ancient relics, grouped by source: <code>Neow</code>, <code>Orobas</code>, <code>Pael</code>, <code>Tezcatara</code>, <code>Nonupeipe</code>, <code>Tanx</code>, <code>Vakuu</code>, <code>Darv</code>

'''Sorting:''' rarity, then character (Any, Ironclad, Silent, Regent, Necrobinder, Defect, Watcher), then base starters before Ancient upgrades, then event source, then name.

'''Caching:''' results are cached under the key <code>Relic2Navbox</code> via LuaCache. The cache has no expiry set in this module, so changes to relic data will not appear in the navbox until the cache is cleared.

== Internal Functions ==
=== <code>getRelicData(name, game)</code> ===
'''Purpose:'''

Queries the <code>Relics</code> Cargo table for the relic with the given name and game. Returns the first matching row (fields: Name, Image, ExclusiveTo, Rarity, Cost, Description, Flavor), or <code>-1</code> if no relic is found.

== Known Issues ==
* '''<code>defineVariables</code> always errors.''' It calls <code>getCargoData</code>, which is not defined anywhere, instead of <code>getRelicData</code>. Every call fails with "attempt to call global 'getCargoData' (a nil value)".
* '''<code>relic_character</code> is always “Any”.''' The module reads the field <code>Character</code>, but the Cargo table stores the character in <code>ExclusiveTo</code>.
* '''[[Template:Lua Relic Infobox]] is out of sync with this module.''' It calls <code>getData</code>, which no longer exists, and reads the old <code>relic_info_</code> variables (including <code>relic_info_module</code>, which is no longer set). Pages in [[:Category:Pages using lua databases]] will show a script error.

== Notes ==
* <code>defineVariables</code> uses <code>frame:preprocess</code> to allow wikitext formatting inside descriptions.
* Every relic row in the <code>Relics</code> Cargo table should have at least Name, Game, Image, Link, and Rarity filled in.
* Variables set by <code>defineVariables</code> are prefixed with <code>relic_</code>. Older templates may still reference the previous <code>relic_info_</code> prefix.
* The only known caller of <code>defineVariables</code> is intended to be [[Template:Lua Relic Infobox]].