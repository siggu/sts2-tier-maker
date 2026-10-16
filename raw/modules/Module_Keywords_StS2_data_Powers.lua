local all_data = {
    ["Buffer"] = {
      Code = "$Buffer",
      Text = "Prevent the next time you would lose HP",
      Link = "Buffs#Buffer",
      Image = "StS2_Icon_Buffer.png",
    },
    ["Confused"] = {
      Code = "$Confused",
      Text = "The costs of your cards are randomized on draw, from 0 to 3.",
      Link = "Debuffs#Confused",
      Image = "StS2_Icon_Confused.png",
	},
    ["Dexterity"] = {
      Code = "$Dexterity",
      Text = "Dexterity improves $Block gained from cards.",
      Link = "Dexterity",
      Image = "StS2_Icon_Dexterity.png",
    },
    ["Frail"] = {
      Code = "$Frail",
      Text = "While Frail, gain 25% less $Block from cards.",
      Link = "Frail",
      Image = "StS2_Icon_Frail.png",
    },
    ["Intangible"] = {
      Code = "$Intangible",
      Text = "Reduce all damage taken and HP loss to 1 this turn.",
      Link = "Buffs#Intangible",
      Image = "StS2_Icon_Intangible.png",
    },
    ["Regen"] = {
      Code = "$Regen",
      Text = "Regen heals HP at the end of your turn. Each turn, Regen is reduced by 1.",
      Link = "Buffs#Regen",
      Image = "StS2_Icon_Regen.png",
    },
    ["Ritual"] = {
      Code = "$Ritual",
      Text = "Gain $ Strength at the end of your turn.",
      Link = "Buffs#Ritual",
      Image = "StS2_Icon_Ritual.png",
    },
    ["Sandpit"] = {
      Code = "$Sandpit",
      Text = "In X turns, you will be eaten and die.",
      Link = "Buffs#Sandpit",
      Image = "StS2_Icon_Sandpit.png",
      },
    ["Strength"] = {
      Code = "$Strength",
      Text = "Strength adds additional damage to Attacks.",
      Link = "Strength",
      Image = "StS2_Icon_Strength.png",
    },
    ["Plating"] = {
      Code = "$Plating",
      Text = "At the end of your turn, gain $Block. Plating is reduced by 1 at the start of your turn.",
      Link = "Buffs#Plating",
      Image = "StS2_Icon_Plating.png",
    },
    ["Vigor"] = {
      Code = "$Vigor",
      Text = "Your next Attack deals additional damage.",
      Link = "Buffs#Vigor",
      Image = "StS2_Icon_Vigor.png",
    },
    ["Vulnerable"] = {
      Code = "$Vulnerable",
      Text = "Vulnerable creatures take 50% more damage from Attacks.",
      Link = "Vulnerable",
      Image = "StS2_Icon_Vulnerable.png",
    },
    ["Weak"] = {
      Code = "$Weak",
      Text = "Weakened creatures deal 25% less damage with Attacks.",
      Link = "Weak",
      Image = "StS2_Icon_Weak.png",
    },
    ["Thorns"] = {
      Code = "$Thorns",
      Text = "When hit by an attack, deal damage back.",
      Link = "Buffs#Thorns",
      Image = "StS2_Icon_Thorns.png",
    }
}

local formatted = {}
for name, keyword in pairs(all_data) do
	keyword.EditLink = "Module:Keywords/StS2_data/Powers"
	formatted[name] = keyword
end

return formatted