local all_data = {
	["Block"] = {
      Code = "$Block",
      Text = "Until next turn, prevents damage.",
      Link = "Block",
      Image = "StS2_Intent_Defend.png",
    },
    ["Enchant"] = {
      Code = "$Enchant",
      Text = "Add an $Enchantment to a card in your Deck.",
      Link = "Enchantments",
    },
    ["Energy"] = {
      Code = "$Energy",
      Text = "Energy is used to play cards from your Hand.",
      Link = "Keywords#Energy",
      Image = "StS2_EnergyColorless.png",
    },
    ["Eternal"] = {
      Code = "$Eternal",
      Text = "Cannot be removed or transformed from your Deck.",
      Link = "Keywords#Eternal",
    },
    ["Ethereal"] = {
      Code = "$Ethereal",
      Text = "If an Ethereal card is in your hand at the end of your turn, it is $Exhausted.",
      Link = "Keywords#Ethereal",
    },
    ["Exhaust"] = {
      Code = "$Exhaust",
      Text = "Removed until the end of combat.",
      Link = "Keywords#Exhaust",
    },
    ["Fatal"] = {
      Code = "$Fatal",
      Text = "Triggers when this card kills a non-{{BD|Minion|minion|2}} enemy.",
      Link = "Fatal"
    },
    ["Innate"] = {
      Code = "$Innate",
      Text = "Start each combat with this card in your hand.",
      Link = "Keywords#Innate",
    },
    ["Stunned"] = {
      Code = "$Stun",
      Text = "This enemy can't act on its next turn.",
      Link = "Keywords#Stunned",
      Image = "StS2_Intent_Stun.png",
      MatchRoot = "Stun",
	},
    ["Retain"] = {
      Code = "$Retain",
      Text = "Retained cards are not discarded at the end of turn.",
      Link = "Keywords#Retain",
    },
    ["Replay"] = {
      Code = "$Replay",
      Text = "Plays this card an additional time.",
      Link = "Keywords#Replay",
    },
    ["Transform"] = {
      Code = "$Transform",
      Text = "Transformed cards become a random card of any rarity, unless specified.",
      Link = "Transform",
    },
    ["Upgrade"] = {
      Code = "$Upgrade",
      Text = "Upgrading cards makes them more powerful. Cards can only be upgraded once.",
      Link = "Upgrade",
    },
    ["Unplayable"] = {
      Code = "$Unplayable",
      Text = "Cannot be played from your Hand.",
      Link = "Keywords#Unplayable",
    },
}

local formatted = {}
for name, keyword in pairs(all_data) do
	keyword.EditLink = "Module:Keywords/StS2_data/Common"
	formatted[name] = keyword
end

return formatted