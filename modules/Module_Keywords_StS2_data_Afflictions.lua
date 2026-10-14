local all_data = {
    ["Bound"] = {
      Code = "$Bound",
      Text = "Only 1 Bound card can be played each turn. Cards are un-Bound at end of turn.",
      Link = "Queen#Queen",
    },
   ["Entangled"] = {
      Code = "$Entangled",
      Text = "Entangled cards cost an additional @CE.",
      Link = "Vine Shambler",
    },
    ["Galvanized"] = {
      Code = "$Galvanized",
      Text = "Take X damage when this card is played.",
      Link = "Globe Head",
    },
    ["Tainted"] = {
      Code = "$Tainted",
      Text = "Take X additional damage from Attacks this turn.",
      Link = "Infested Prism",
    },
}

local formatted = {}
for name, keyword in pairs(all_data) do
	keyword.EditLink = "Module:Keywords/StS2_data/Afflictions"
	formatted[name] = keyword
end

return formatted