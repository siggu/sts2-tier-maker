local all_data = {
    ["Lightning Orb"] = {
      Code = "@LO",
      Text = "The Defect's Lightning Orb in Slay the Spire 2.",
      Link = "Keywords#Orb_Types",
      Image = "StS2_LightningOrb.png",
    },
    ["Frost Orb"] = {
      Code = "@FO",
      Text = "The Defect's Frost Orb in Slay the Spire 2.",
      Link = "Keywords#Orb_Types",
      Image = "StS2_FrostOrb.png",
    },
    ["Dark Orb"] = {
      Code = "@DO",
      Text = "The Defect's Dark Orb in Slay the Spire 2.",
      Link = "Keywords#Orb_Types",
      Image = "StS2_DarkOrb.png",
    },
    ["Plasma Orb"] = {
      Code = "@PO",
      Text = "The Defect's Plasma Orb in Slay the Spire 2.",
      Link = "Keywords#Orb_Types",
      Image = "StS2_PlasmaOrb.png",
    },
    ["Glass Orb"] = {
      Code = "@GO",
      Text = "The Defect's Glass Orb.",
      Link = "Keywords#Orb_Types",
      Image = "StS2_GlassOrb.png",
    },
	["Energy (Ironclad)"] = {
	   Code = "@IE",
	   Text = "The {{StS2|Ironclad}}'s Energy orb in Slay the Spire 2. Energy is a resource used to play cards.",
	   Link = "Keywords#Energy",
	   Image = "StS2_EnergyIronclad.png",
	},
	["Energy (Silent)"] = {
	    Code = "@SE",
	    Text = "The {{StS2|Silent}}'s Energy orb in Slay the Spire 2. Energy is a resource used to play cards.",
	    Link = "Keywords#Energy",
	    Image = "StS2_EnergySilent.png",
	},
	["Energy (Defect)"] = {
	    Code = "@DE",
	    Text = "The {{StS2|Defect}}'s Energy orb in Slay the Spire 2. Energy is a resource used to play cards.",
	    Link = "Keywords#Energy",
	    Image = "StS2_EnergyDefect.png",
	},
	["Energy (Regent)"] = {
	    Code = "@RE",
	    Text = "The {{StS2|Regent}}'s Energy orb. Energy is a resource used to play cards.",
	    Link = "Keywords#Energy",
	    Image = "StS2_EnergyRegent.png",
	},
	["Star"] = {
	    Code = "@ST",
	    Text = "The {{StS2|Regent}}'s Stars. Stars are an alternate resource used to play cards.",
	    Link = "Stars",
	    Image = "StS2_StarRegent.png",
	},
	["Energy (Necrobinder)"] = {
	    Code = "@NE",
	    Text = "The {{StS2|Necrobinder}}'s Energy orb. Energy is a resource used to play cards.",
	    Link = "Keywords#Energy",
	    Image = "StS2_EnergyNecrobinder.png",
	},
	["Energy (Colorless)"] = {
	    Code = "@CE",
	    Text = "The generic Energy icon found on all Colorless cards in Slay the Spire 2. Energy is a resource used to play cards.",
	    Link = "Keywords#Energy",
	    Image = "StS2_EnergyColorless.png",
	},
	["Watcher Energy"] = {
	    Code = "@WE",
	    Text = "(StS2) The Watcher Energy orb. It is not used in the Slay the Spire 2",
	    Link = "Keywords#Energy",
	    Image = "StS2_EnergyWatcher.png",
	},
 }
 
local formatted = {}
for name, icon in pairs(all_data) do
	icon.EditLink = "Module:Keywords/StS2_data/Icons"
	formatted[name] = icon
end

return formatted