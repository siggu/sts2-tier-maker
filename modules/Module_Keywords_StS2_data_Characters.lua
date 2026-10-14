local all_data = {
    ["Neow"] = {
      Code = "@Neow",
      Text = "",
      Link = "Neow",
      Image = "StS2_IconNeow.png",
      NoTooltip = "True",
	},
    ["Orobas"] = {
      Code = "@Orobas",
      Text = "",
      Link = "Orobas",
      Image = "StS2_IconOrobas.png",
      NoTooltip = "True",
	},
    ["Darv"] = {
      Code = "@Darv",
      Text = "",
      Link = "Darv",
      Image = "StS2_IconDarv.png",
      NoTooltip = "True",
	},
    ["Tezcatara"] = {
      Code = "@Tezcatara",
      Text = "",
      Link = "Tezcatara",
      Image = "StS2_IconTezcatara.png",
      NoTooltip = "True",
	},
    ["Tanx"] = {
      Code = "@Tanx",
      Text = "",
      Link = "Tanx",
      Image = "StS2_IconTanx.png",
      NoTooltip = "True",
	},
    ["Pael"] = {
      Code = "@Pael",
      Text = "",
      Link = "Pael",
      Image = "StS2_IconPael.png",
      NoTooltip = "True",
	},
    ["Nonupeipe"] = {
      Code = "@Nonupeipe",
      Text = "",
      Link = "Nonupeipe",
      Image = "StS2_IconNonupeipe.png",
      NoTooltip = "True",
	},
    ["Vakuu"] = {
      Code = "@Vakuu",
      Text = "",
      Link = "Vakuu",
      Image = "StS2_IconVakuu.png",
      NoTooltip = "True",
	},
	["Ironclad"] = {
      Code = "@Ironclad",
      Text = "",
      Link = "Ironclad",
      Image = "StS2_IconIronclad.png",
      NoTooltip = "True",
	},
	["Silent"] = {
      Code = "@Silent",
      Text = "",
      Link = "Silent",
      Image = "StS2_IconSilent.png",
      NoTooltip = "True",
	},
	["Regent"] = {
      Code = "@Regent",
      Text = "",
      Link = "Regent",
      Image = "StS2_IconRegent.png",
      NoTooltip = "True",
	},
	["Necrobinder"] = {
      Code = "@Necrobinder",
      Text = "",
      Link = "Necrobinder",
      Image = "StS2_IconNecrobinder.png",
      NoTooltip = "True",
	},
	["Defect"] = {
      Code = "@Defect",
      Text = "",
      Link = "Defect",
      Image = "StS2_IconDefect.png",
      NoTooltip = "True",
	},
	["Gold"] = {
    	Code = "@Gold",
    	Text = "",
    	Link = "Gold",
    	Image = "StS2_Gold.png",
    	NoTooltip = "True",
      }
}

local formatted = {}
for name, keyword in pairs(all_data) do
	keyword.EditLink = "Module:Keywords/StS2_data/Characters"
	formatted[name] = keyword
end

return formatted