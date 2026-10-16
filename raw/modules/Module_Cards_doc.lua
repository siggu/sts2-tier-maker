This module is Lua code meant to provide wikitext data for cards to various templates using data modules.

Go to [[Module:Cards/doc]] to edit this documentation.

== Data Modules Used ==
* [[Module:Cards/data]]
* [[Module:Cards/StS2 data]]

== Related Modules ==
* [[Module:Cards/filtering]]

== Transcluded In ==
* [[Template:Card Infobox]]
* [[Template:Small Card Infobox]]
* [[Template:C]]

== Public Functions ==
The below functions are exported for use in templates or pages with the <code><nowiki>#invoke</nowiki></code> parser function.

=== p.getCombinedDescription ===
Returns a card's description with the normal and upgraded text combined into one string with this format: "Base Stat (Upgraded Stat)"

The upgraded stats are highlighted in green using [[Template:TS]].

'''Usage:''' <code><nowiki>{{#invoke:Cards|getCombinedDescription|card name|sequel}}</nowiki></code>

=== p.getData ===
Provides several MediaWiki variables for use in [[Template:Card Infobox]] and [[Template:Small Card Infobox]].

'''Usage:''' <code><nowiki>{{#invoke:Cards|getData|card name|override name|sequel}}</nowiki></code>

==== Variables Defined ====
* <code><nowiki>card_info_name</nowiki></code>
* <code><nowiki>card_info_rarity</nowiki></code>
* <code><nowiki>card_info_type</nowiki></code>
* <code><nowiki>card_info_energycost</nowiki></code>
* <code><nowiki>card_info_energycostplus</nowiki></code>
* <code><nowiki>card_info_starcost</nowiki></code>
* <code><nowiki>card_info_description</nowiki></code>
* <code><nowiki>card_info_descriptionplus</nowiki></code>
* <code><nowiki>card_info_image</nowiki></code>
* <code><nowiki>card_info_imageplus</nowiki></code>
* <code><nowiki>card_info_art</nowiki></code>
* <code><nowiki>card_info_noupgrade</nowiki></code>
* <code><nowiki>card_info_color</nowiki></code>
* <code><nowiki>card_info_hasbeta</nowiki></code>
* <code><nowiki>card_info_imagebeta</nowiki></code>
* <code><nowiki>card_info_artbeta</nowiki></code>

=== p.colorCardName ===
Returns the card's name with a text stroke around it, colored according to its rarity. Currently only meant for use in [[Template:Card Infobox]].

'''Usage:''' <code><nowiki>{{#invoke:Cards|colorCardName|card name|rarity}}</nowiki></code>

=== p.getInline ===
Returns an inline card link with a small card icon next to it. Used for [[Template:C]].

'''Usage:''' <code><nowiki>{{#invoke:Cards|getInline|card name|override name|sequel}}</nowiki></code>

=== p.getIcon ===
Returns ''only'' the mini card icon. Used in [[Template:Small Card Infobox]].

'''Usage:''' <code><nowiki>{{#invoke:Cards|getIcon|card name|icon size (in px)|sequel}}</nowiki></code>

=== p.getEnergyIcon ===
Returns the energy icon for the card. Used in [[Template:Small Card Infobox]] to show the card's cost.

'''Usage:''' <code><nowiki>{{#invoke:Cards|getEnergyIcon|card name|icon size (in px)|sequel}}</nowiki></code>

=== p.getStacked ===
Returns an html div containing a stack of overlaid images for every part of a given card. Used for [[Template:Card Parts]] which is in turn only used in [[Template:Card Infobox]]. The function is split to Slay the Spire 1 and 2

'''Usage:''' <code><nowiki>{{#invoke:getStacked|card name|card height (without units)|beta art (true|false)|sequel|image|color|rarity|type|cost|starcost|noupgrade (bool)|OverrideColor|UpgradeArtOverride}}</nowiki></code>