-- IMPORTANT! This module is split into separate submodules, if you want to make an edit to a particular keyword, find their submodule first.

local KEYWORD_DATA = {
	require('Module:Keywords/StS2 data/Common'), --contains both shared keywords
	require('Module:Keywords/StS2 data/Player'), --contains keywords exclusive to players cards.
	require('Module:Keywords/StS2 data/Enchantments'), --contains Enchantments
	require('Module:Keywords/StS2 data/Characters'), --contains All StS2 Characters
	require('Module:Keywords/StS2 data/Afflictions'), --contains the Afflictions that aren't covered in the Power module
	require('Module:Keywords/StS2 data/Custom Mode'), --contains Custom Mode Modifiers
	--require('Module:Keywords/StS2 data/Powers'), --contains keywords that apply Powers(buffs/debuffs).
	--require('Module:Powers/StS2 data'), --contains Powers (Buffs and Debuffs) --to be removed and disconnected from Module:Keywords
}
local ICON_DATA = {
	require('Module:Keywords/StS2 data/Icons'),
	require('Module:Keywords/StS2 data/Characters'), --contains All StS2 Characters
}

local keywords = {}
local icons = {}

for _, character_cards in ipairs(KEYWORD_DATA) do
	for card_name, card in pairs(character_cards) do
		keywords[card_name] = card
	end
end
for _, character_cards in ipairs(ICON_DATA) do
	for card_name, card in pairs(character_cards) do
		icons[card_name] = card
	end
end

return {
	Icons = icons,
	Keywords = keywords
}