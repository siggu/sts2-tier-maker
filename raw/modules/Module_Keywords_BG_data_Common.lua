local all_data = {
	["Block"] = {
      Code = "$Block",
      Text = "Until next turn, prevents damage.",
      Link = "Block",
      Image = "StS2_Intent_Defend.png",
    },
	["Strength"] = {
      Code = "Strength",
      Text = "You Deal +1 damage on each hit @Hit for each @Strength token you have.",
      Link = "Ironclad",
    },
	["Exhaust"] = {
      Code = "$Exhaust",
      Text = "Exhausted card is removed from your deck. Keep Exhausted cards in a separate pile and return them to your deck at the end of combat. .",
      Link = "Ironclad",
    },
    ["Channel"] = {
    	Code = "$Channel",
    	Text = "Place an orb in an open Orb slot on the player board.",
    	Link = "Defect"
    },
    ["Evoke"] = {
    	Code = "$Evoke",
    	Text = "Remove an orb of your choice from its slot and apply the Evoke effect for that type of Orb",
    	Link = "Defect"
    }
}

local formatted = {}
for name, keyword in pairs(all_data) do
	keyword.EditLink = "Module:Keywords/StS2_data/Common"
	formatted[name] = keyword
end

return formatted