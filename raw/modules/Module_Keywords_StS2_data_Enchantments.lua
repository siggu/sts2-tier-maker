local all_data = {
    ["Adroit"] = {
      Code = "$Adroit",
      Text = "Gain X $Block.",
      Link = "Enchantments#Adroit",
      Image = "Enchant_Adroit.png",
    },
    ["Clone"] = {
      Code = "$Clone",
      Text = "This card can be duplicated at Rest Sites.",
      Link = "Enchantments#Clone",
      Image = "Enchant_Clone.png",
    },	
    ["Corrupted"] = {
      Code = "$Corrupted",
      Text = "Deal 50% more damage, but lose 2 HP.",
      Link = "Enchantments#Corrupted",
      Image = "Enchant_Corrupted.png",
    },
    ["Favored"] = {
      Code = "$Favored",
      Text = "This card's attack damage is doubled.",
      Link = "Enchantments#Favored",
      Image = "Enchant_Favored.png",
    },
    ["Glam"] = {
      Code = "$Glam",
      Text = "This card has $Replay once per combat.",
      Link = "Enchantments#Glam",
      Image = "Enchant_Glam.png",
    },
    ["Goopy"] = {
      Code = "$Goopy",
      Text = "This card gains $Exhaust. When played, permanently increase this card's $Block by 1.",
      Link = "Enchantments#Goopy",
      Image = "Enchant_Goopy.png",
    },
    ["Imbued"] = {
      Code = "$Imbued",
      Text = "This card is played automatically at the start of each combat.",
      Link = "Enchantments#Imbued",
      Image = "Enchant_Imbued.png",
    },
    ["Instinct"] = {
      Code = "$Instinct",
      Text = "This card's attack damage is doubled.",
      Link = "Enchantments#Instinct",
      Image = "Enchant_Instinct.png",
    },
    ["Momentum"] = {
      Code = "$Momentum",
      Text = "Increase this card's attack damage by X this combat when played.",
      Link = "Enchantments#Momentum",
      Image = "Enchant_Momentum.png",
    },
    ["Nimble"] = {
      Code = "$Nimble",
      Text = "Increases Block gained from this card by X.",
      Link = "Enchantments#Nimble",
      Image = "Enchant_Nimble.png",
    },
    ["Perfect Fit"] = {
      Code = "$Perfect Fit",
      Text = "Whenever this would be shuffled into your Draw Pile, place it on the top instead.",
      Link = "Enchantments#Perfect_Fit",
      Image = "Enchant_PerfectFit.png",
    },
    ["Royally Approved"] = {
      Code = "$Royally Approved",
      Text = "This card has $Innate and $Retain.",
      Link = "Enchantments#Royally_Approved",
      Image = "Enchant_RoyallyApproved.png",
    },
    ["Sharp"] = {
      Code = "$Sharp",
      Text = "Increases damage on this card by X.",
      Link = "Enchantments#Sharp",
      Image = "Enchant_Sharp.png",
    },
    ["Slither"] = {
      Code = "$Slither",
      Text = "When you draw this card, randomize its cost from 0 to 3.",
      Link = "Enchantments#Slither",
      Image = "Enchant_Slither.png",
    },
    ["Slumbering Essence"] = {
      Code = "$Slumbering Essence",
      Text = "If this card is in your hand at the end of turn, reduce its cost by 1 until it is played.",
      Link = "Enchantments#Slumbering_Essence",
      Image = "Enchant_SlumberingEssence.png",
    },
    ["Soul's Power"] = {
      Code = "$Soul's Power",
      Text = "This card loses $Exhaust.",
      Link = "Enchantments#Soul's_Power",
      Image = "Enchant_SoulsPower.png",
    },
    ["Sown"] = {
      Code = "$Sown",
      Text = "The first time you play this card each combat, gain $Energy.",
      Link = "Enchantments#Sown",
      Image = "Enchant_Sown.png",
    },
    ["Spiral"] = {
      Code = "$Spiral",
      Text = "This card gains $Replay 1.",
      Link = "Enchantments#Spiral",
      Image = "Enchant_Spiral.png",
    },
    ["Steady"] = {
      Code = "$Steady",
      Text = "This card gains $Retain.",
      Link = "Enchantments#Steady",
      Image = "Enchant_Steady.png",
    },
    ["Swift"] = {
      Code = "$Swift",
      Text = "The first time you play this card, draw X cards.",
      Link = "Enchantments#Swift",
      Image = "Enchant_Swift.png",
    },
    ["Tezcatara's Ember"] = {
      Code = "$Tezcatara's Ember",
      Text = "Costs 0, deals 3 additional damage, and gains $Eternal.",
      Link = "Enchantments#Tezcatara's_Ember",
      Image = "Enchant_TezcatarasEmber.png",
    },
    ["Vigorous"] = {
      Code = "$Vigorous",
      Text = "The first time this card is played, it deals X additional damage.",
      Link = "Enchantments#Vigorous",
      Image = "Enchant_Vigorous.png",
    },
    ["Inky"] = {
      Code = "$Inky",
      Text = "This card applies 1 $Weak.",
      Link = "Enchantments#Inky",
      Image = "Enchant_Inky.png",
    },
}

local formatted = {}
for name, keyword in pairs(all_data) do
	keyword.EditLink = "Module:Keywords/StS2_data/Enchantments"
	formatted[name] = keyword
end

return formatted