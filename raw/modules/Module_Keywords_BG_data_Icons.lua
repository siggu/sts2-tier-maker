local all_data = {
	["Block"] = {
      Code = "@Block",
      Text = "Until next turn, prevents damage.",
      Link = "Block",
      Image = "BG_Defend.png",
    },
	["Hit"] = {
      Code = "@Hit",
      Text = "Deal X damage.",
      Link = "Hit",
      Image = "BG_Hit.png",
    },
	["Dice1"] = {
      Code = "@Die1",
      Text = "Abilities Trigger on the indicated die result.",
      Link = "",
      Image = "BG_Die1.png",
    },
	["Dice 2"] = {
      Code = "@Die2",
      Text = "Abilities Trigger on the indicated die result.",
      Link = "",
      Image = "BG_Die2.png",
    },
	["Dice 3"] = {
      Code = "@Die3",
      Text = "Abilities Trigger on the indicated die result.",
      Link = "",
      Image = "BG_Die3.png",
    },
	["Dice 4"] = {
      Code = "@Die4",
      Text = "Abilities Trigger on the indicated die result.",
      Link = "",
      Image = "BG_Die4.png",
    },
	["Dice 5"] = {
      Code = "@Die5",
      Text = "Abilities Trigger on the indicated die result.",
      Link = "",
      Image = "BG_Die5.png",
    },
	["Dice 6"] = {
      Code = "@Die6",
      Text = "Abilities Trigger on the indicated die result.",
      Link = "",
      Image = "BG_Die6.png",
    },
    ["Strength"] = {
    	Code = "@Strength",
    	Text = "You deal +1 damage on each @Hit for each token you have. A player can have a maximum of 8@Strength.",
    	Link = "Ironclad#Strength",
    	Image = "BG_Strength.png"
    },
    ["Red Energy"] = {
      Code = "@RE",
      Text = "The [[Ironclad]]'s Energy orb. Energy is a resource used to play cards.",
      Link = "Keywords#Energy",
      Image = "RedEnergy.png",
    },
    ["Green Energy"] = {
      Code = "@GE",
      Text = "The [[Silent]]'s Energy orb. Energy is a resource used to play cards.",
      Link = "Keywords#Energy",
      Image = "GreenEnergy.png",
    },
    ["Blue Energy"] = {
      Code = "@BE",
      Text = "The [[Defect]]'s Energy orb. Energy is a resource used to play cards.",
      Link = "Keywords#Energy",
      Image = "BlueEnergy.png",
    },
    ["Purple Energy"] = {
      Code = "@PE",
      Text = "The [[Watcher]]'s Energy orb. Energy is a resource used to play cards.",
      Link = "Keywords#Energy",
      Image = "PurpleEnergy.png",
      Size = "20px",
    },
    ["Colorless Energy"] = {
      Code = "@CE",
      Text = "The generic Energy icon found on all Colorless cards. Energy is a resource used to play cards.",
      Link = "Keywords#Energy",
      Image = "ColorlessEnergy.png",
    },
}

local formatted = {}
for name, icon in pairs(all_data) do
	icon.EditLink = "Module:Keywords/BG_data/Icons"
	formatted[name] = icon
end

return formatted