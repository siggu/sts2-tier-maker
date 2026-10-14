-- IMPORTANT! This module is split into separate submodules for each character, if you want to make an edit to a particular card, find their submodule first.

-- Thank you to the Mewgenics Wiki for this implementation!
local ALL_DATA = {
	require('Module:Cards/StS2 data/Ironclad'),
	require('Module:Cards/StS2 data/Silent'),
	require('Module:Cards/StS2 data/Regent'),
	require('Module:Cards/StS2 data/Necrobinder'),
	require('Module:Cards/StS2 data/Defect'),
	require('Module:Cards/StS2 data/Colorless')
}


local data = {}

for _, character_cards in ipairs(ALL_DATA) do
	for card_name, card in pairs(character_cards) do
		data[card_name] = card
	end
end

return data