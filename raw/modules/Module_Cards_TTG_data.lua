-- IMPORTANT! This module is split into separate submodules for each character, if you want to make an edit to a particular card, find their submodule first.

-- Thank you to the Mewgenics Wiki for this implementation!
local ALL_DATA = {
	require('Module:Cards/TTG data/Ironclad'),
	require('Module:Cards/TTG data/Silent'),
	require('Module:Cards/TTG data/Defect'),
	require('Module:Cards/TTG data/Watcher'),
	require('Module:Cards/TTG data/Colorless')
}


local data = {}

for _, character_cards in ipairs(ALL_DATA) do
	for card_name, card in pairs(character_cards) do
		data[card_name] = card
	end
end

return data