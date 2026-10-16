-- IMPORTANT! This module is split into separate submodules, if you want to make an edit to a particular keyword, find their submodule first.

local KEYWORD_DATA = {
	require('Module:Keywords/BG data/Common'), --contains both shared keywords
}
local ICON_DATA = {
	require('Module:Keywords/BG data/Icons'),
	require('Module:Keywords/BG data/Characters'), --contains All StS2 Characters
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