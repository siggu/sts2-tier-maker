local vars = mw.ext.VariablesLua
local cargo = mw.ext.cargo
local cache = require 'mw.ext.LuaCache'
-----------------------------------------------------------------------------
local p = {}

function getCardData(name, sequel)
	local fields = 'Name, Image, Color, OverrideColor, Type, Rarity, Cost, CostPlus, StarCost, NoUpgrade, Description'
    local query_results = cargo.query('Cards', fields, { where = 'Cards.Name = "' .. name .. '" AND Cards.Game = "' .. sequel .. '"' })
    local data = query_results[1] or -1
    return data
end

function get_description(input, upgraded)
    -- Pattern to match [base_stat|upgraded_stat]
    return string.gsub(input, "%((.-);(.-)%)", function(base, upgrade)
        return upgraded and "<span class=stat-upgraded>"..upgrade.."</span>" or base
    end)
end

function p.parse_description(frame)
	local input = frame.args[1]
	local upgraded = frame.args[2] == "true"
    -- Pattern to match [base_stat;upgraded_stat] changed | to ; because pipes break the invoke
    local output = string.gsub(input, "%((.-);(.-)%)", function(base, upgrade)
        return upgraded and "<span class=stat-upgraded>"..frame:preprocess(upgrade).."</span>" or frame:preprocess(base)
    end)
    return frame:preprocess(output)
end

function combineDescription(description, noBreaks)
	local pattern = "%((.-);(.-)%)"
	result, _ = string.gsub(description, pattern, function(base, upg)
    	local formatted_upg = upg ~= "" and " (<span class='ts-positive'>"..upg.."</span>)" or " (<span class='ts-positive'>loses "..base.."</span>)"
        return base..(formatted_upg:gsub("%<br%>", ""):gsub("%> ", "%>"):gsub(" %)", "%) "):gsub(" %(%)", ""))
	end)
	if noBreaks then
		result = string.gsub(result, '<br>',' ')
	end
	return result
end
	
function p.getCombinedDescription(frame)
	local name = frame.args[1]
	local sequel = frame.args[2] or "1"
	
	local card = getCardData(name, (sequel or "1"))
	if card == -1 then
		return "No Cargo data exists for card '"..name.."'"
	end
	
	local result = combineDescription(card.Description, false)
    return frame:preprocess(result)
end

function p.combineDescription(frame)
	local input = frame.args[1]
	local noBreaks = frame.args[2] or false
	
    return combineDescription(input, noBreaks)
end

function p.defineImageVariables(frame)
	local Image = frame.args[1]
	local no_upgrade =  frame.args[2] == "true"
	local sequel = frame.args[3]
	
	local name = frame.args[4]
	local color = frame.args[5]
	local rarity = frame.args[6]
	local card_type = frame.args[7]
	
	local function formatOutput(input)
		return string.gsub(input, '_', ' ')
	end
	
	vars.vardefine('card_image', formatOutput(Image))
	if not no_upgrade then
		vars.vardefine('card_imageplus', formatOutput(no_upgrade and nil or Image:gsub("(%.%w+)$", "Plus%1")))
	end
	vars.vardefine('card_art', formatOutput(Image:match("(.+)%..+$").."-Art.png"))
	
	local beta_art = (sequel == "2" and "StS2 " or "").."Beta-"..Image:gsub("StS2_", ""):match("(.+)%..+$").."-Art.png"
	local file_title = "File:"..beta_art
	
	local hasBeta = (cargo.query('_pageData', '_pageName', {where = '_pageName = "'..file_title..'"'}))[1]  ~= nil
	vars.vardefine('card_info_hasbeta', tostring(hasBeta))
	
	if hasBeta then
		vars.vardefine("card_artbeta", formatOutput(beta_art))
		vars.vardefine("card_imagebeta", formatOutput((sequel == "2" and "StS2_" or "").."Beta-"..Image:gsub("StS2_", ""):match("(.+)%..+$")..".png"))
		if not no_upgrade then
			vars.vardefine("card_imagebetaplus", formatOutput((sequel == "2" and "StS2_" or "").."Beta-"..Image:gsub("StS2_", ""):match("(.+)%..+$").."Plus.png"))
		end
	end
	vars.vardefine("card_icon", formatOutput(getIcon(name, color, rarity, card_type, sequel, true)))
end

function getIcon(name, color, rarity, card_type, sequel, nolink)
	local character_colors = {
		["Red"] = "Ironclad",
		["Green"] = "Silent",
		["Blue"] = "Defect",
		["Purple"] = "Watcher",
		["Colorless"] = "Colorless"
	}
	local final_image = ""
	local normalized_rarity = rarity
	if rarity == "Basic" or rarity == "Special" then
		normalized_rarity = "Common"
	end
	
	if (card_type == "Status") then
		final_image = "Status"
	elseif (card_type == "Curse") then
		final_image = "Curse"
	elseif (sequel and card_type == "Quest") then
		final_image = "Quest"
	else
		final_image = card_type and ((character_colors[color] or color).."_"..card_type.."_"..normalized_rarity) or ""
	end
	
	if nolink then
		return (sequel == "2" and "StS2_" or "").."CardIcon_"..final_image..".png"
	else
		return "[[File:"..(sequel == "2" and "StS2_" or "").."CardIcon_"..final_image..".png|24px|middle|link=".. (sequel == "2" and "StS2:" or "") .. name .. "]]"
	end
end

function p.getIcon(name, color, rarity, card_type, sequel, nolink)
	return getIcon(name, color, rarity, card_type, sequel, nolink)
end

function getCardData(name, sequel)
	local fields = 'Link, Name, Image, Color, OverrideColor, Type, Rarity, Cost, CostPlus, StarCost, NoUpgrade, Description'
    local query_results = cargo.query('Cards', fields, { where = 'Cards.Name = "' .. name .. '" AND Cards.Game = "' .. sequel .. '"' })
    local data = query_results[1] or -1
    return data
end

function p.getCharacterLink(frame)
	local color = frame.args[1]
	local sequel = frame.args[2] or "1"
	
	local char_map = {
		["Red"] = "Ironclad",
		["Green"] = "Silent",
		["Blue"] = "Defect",
		["Purple"] = "Watcher",
		["Colorless"] = "Colorless"
	}
	
	return frame:preprocess("{{QueryLink|Cards|color:"..color.."|"..(char_map[color] or color).."|".. (sequel or "1") .."|true}}")
end

function p.colorCardName(frame)
	local card_name = frame.args[1]
	local rarity = frame.args[2]
	
	local color_map = {
		Common   = "#4d4b40",
		Uncommon = "#005c75",
		Rare     = "#6b4b00",
		Ancient  = "#4d4b40",
		Status   = "#4f522f",
		Curse    = "#550b9e",
		Event    = "#1b6131",
		Quest    = "#7e3e15"
	}
	
	local text_stroke = "paint-order: stroke fill; -webkit-text-stroke: "..(color_map[rarity] or "#4d4b40").." 0.24rem; "
	local shadow = "text-shadow: 2px 2px #0000001a,3px 3px #0000001a,4px 3px #0000001a,4px 1px #0000001a,2px 3px #0000001a;"
		
	return "<span style='"..text_stroke..shadow.."'>"..card_name.."</span>"
end

function p.colorCardCost(frame)
	local cost = frame.args[1]
	local character = frame.args[2]
	-- Deals with cards that appear as colored when they are actually colorless
	local override_character = frame.args[3] ~= "" and frame.args[3] or frame.args[2]
	
	local color_map = {
		Ironclad    = "#802020",
		Silent      = "#1a6625",
		Regent      = "#803d0e",
		Necrobinder = "#803367",
		Defect      = "#1d5673",
		Colorless   = "#5c5440"
	}
	
	local text_stroke = "paint-order: stroke fill; -webkit-text-stroke: "..(color_map[override_character] or "#4c4943").." 0.36rem;"
	return "<span style='"..text_stroke.."'>"..cost.."</span>"
end

function p.getInline(frame)
	local name = mw.text.trim(tostring(frame.args[1]))
	local label = frame.args[2] ~= "" and frame.args[2] or frame.args[1]
	local sequel = frame.args[3] or "1"
	local no_icon = frame.args[4] == 'true'
	
	local query_data = cargo.query('CardArt',
		'Icon=Icon, Link=Link', {where = 'CardArt.Name ="'..name..'" AND CardArt.Game ="'..sequel..'"'}
	)
	local card = query_data[1]
	if not card then 
		local link = (sequel=="2" and "Slay the Spire 2:" or "").. name
		return '[[File:ErrorImage.png|24px|middle|link='.. link ..']] [['.. link ..'|'.. name ..']]' 
	end
	
	local link = "[["..card.Link.."|"..label.."]]"
	if no_icon then return link end
	return '[[File:'..card.Icon..'|24px|middle|link='..card.Link..']] '..link
end

-- Small Card Infobox functions
function p.getSummary(frame)
	local name = frame.args[1]
	local sequel = frame.args[2] or '1'
	
	local card = getCardData(name, sequel)
	
	local color_map = {
		["Red"] = "Ironclad",
		["Green"] = "Silent",
		["Blue"] = "Defect",
		["Purple"] = "Watcher",
		["Colorless"] = "Colorless"
	}
	
	local charText = "{{QueryLink|Cards|color:"..card.Color.."|"..(color_map[card.Color] or card.Color).."|"..sequel.."|true}}"
	local typeText = ""
	if card.Type == "Curse" then
		typeText = "{{QueryLink|Cards|type:Curse|Curse|2|true}}"
	elseif card.Type == "Status" then
		typeText = "{{QueryLink|Cards|type:Status|Status|2|true}}"
	elseif card.Type == "Quest" then
		typeText = "{{QueryLink|Cards|type:Quest|Quest|2|true}}"
	else
		typeText = "{{QueryLink|Cards|rarity:"..card.Rarity.."&type:"..card.Type.."|"..card.Rarity.." "..card.Type.."|"..sequel.."|true}}"
	end
	
	local costText = (card.Cost == "-1" and "X" or card.Cost)
		..(card.CostPlus and ("({{TS|positive||"..card.CostPlus.."}})") or "")
		.." Energy"
		..(card.StarCost and (" - "..card.StarCost.."{{Icon2|ST|18px}}") or "")
		
	if card.Cost == "-2" then
		costText = "Unplayable"
	end
		
	if card.Type == "Curse" or card.Type == "Status" or card.Type == "Quest" then
		return frame:preprocess(costText.." - "..typeText)
	else
		return frame:preprocess(costText.." - "..typeText.." - "..charText)
	end
end

function getEnergyIcon(color, sequel, size)
	if sequel == "2" then
		return "[[File:StS2_Energy"..color..".png|"..size.."|link=]]"
	else
		return "[[File:"..color.."Energy.png|"..size.."|link=]]"
	end
end


function p.getStacked(frame)
	-- please save me from this hell of my own creation
	local name = frame.args[1]
	local size = tonumber(frame.args[2])
	if not size then return '' end
	local beta_art = frame.args[3] == "true" and "Beta-" or ""
	
	local data = {
		Sequel = frame.args[4] or "1",
		Image = frame.args[5] or "Site-Logo.png",
		Color = frame.args[6] or "Colorless",
		Rarity = frame.args[7] or "Basic",
		Type = frame.args[8] or "Skill",
		Cost = frame.args[9] or "0",
		StarCost = frame.args[10] or "",
		NoUpgrade = frame.args[11]=="True",
		OverrideColor = frame.args[12],
		UpgradeArtOverride = frame.args[13]
	}

    if data.Sequel == "2" then
    	return sts2_getStacked(data, size, beta_art, name)
    else
    	return sts_getStacked(data, size, beta_art)
    end
end

function sts_getStacked(data, size, beta_art, testdata)
	local full_beta = beta_art .. data.Image:match("(.+)%..+$")
	
    local actual_color = data.Color
    if data.OverrideColor ~= "" and OverrideColor ~= "{{{OverrideColor}}}" then
    	actual_color = data.OverrideColor
    end
    	
    
	local full_beta = beta_art .. data.Image:match("(.+)%..+$")

	local size_base = size.."px"
	local art_width = tostring(math.ceil(size * (167/350)))
	local art_height = tostring(math.ceil(size * (125/350)))

	local art_pos_top = tostring(math.ceil(size * (64/350)))
	local art_pos_left = tostring(math.ceil(size * (91/350)))
	
	local card_bg = ""
	local card_banner = "<span style='position: absolute; top: 5px'>[[File:BannerCommon.png|"..size_base.."|class=card-image-part|frameless|link=]]</span>"
	local card_frame = ""
	local card_art = "<span style='position: absolute; top: "
		..art_pos_top.."px; left: "..art_pos_left.."px; aspect-ratio: auto 167 / 125;'>"..
		"[[File:"..full_beta.."-Art.png|"
		..art_width.."x"..art_height.."px|class=card-image-part-art|frameless|link=]]</span>"
	
	local card_energy_orb = ""
	-- Get card background
	if data.Type == "Curse" then
		card_bg = "[[File:BgCurse.png|"..size_base.."|class=card-image-part-bg|frameless|link=]]"
	elseif data.Type == "Status" then
		card_bg = "[[File:BgSkillColorless.png|"..size_base.."|class=card-image-part-bg|frameless|link=]]"
	else
		card_bg = "[[File:Bg"..data.Type..actual_color..".png|"..size_base.."|class=card-image-part-bg|frameless|link=]]"
	end
	-- Get card banner 
	if data.Rarity == "Uncommon" then
		card_banner = "<span style='position: absolute; top: 5px'>[[File:BannerUncommon.png|"..size_base.."|class=card-image-part|frameless|link=]]</span>"
	elseif  data.Rarity == "Rare" then
		card_banner = "<span style='position: absolute; top: 5px'>[[File:BannerRare.png|"..size_base.."|class=card-image-part|frameless|link=]]</span>"
	end
	-- Get card frame
	if data.Type == "Curse" or data.Type == "Status" then
		card_frame = "[[File:FrameSkillCommon.png|"..size_base.."|class=card-image-part|frameless|link=]]"
	else
		local rarity = data.Rarity
		if data.Rarity == "Basic" or data.Rarity == "Special" or data.Type == "Curse" then
			rarity = "Common"
		end
		card_frame = "[[File:Frame"..data.Type..rarity..".png|"..size_base.."|class=card-image-part|frameless|link=]]"
	end
	-- Get card energy orb 
	
	if data.Type == "Curse" and tonumber(data.Cost) ~= -2 then
		card_energy_orb = "<span style='position: absolute; top: 3px;'>[[File:CardColorlessOrb.png|"..size_base.."|class=card-image-part|frameless|link=]]</span>"
	elseif tonumber(data.Cost) ~= -2 then
		card_energy_orb = "<span style='position: absolute; top: 3px;'>[[File:Card"..actual_color.."Orb.png|"..size_base.."|class=card-image-part|frameless|link=]]</span>"
	end
	
	return "<div class='card-image-stack' style='width: 350px; height: 350px;'>"..card_bg.." "..card_art.." "..card_frame.." "..card_banner.." "..card_energy_orb.."</div>"
end

function sts2_getStacked(card_data, size, beta_art, name)
	local actual_color = card_data.OverrideColor
	if actual_color == nil or actual_color == "" or actual_color == "{{{OverrideColor}}}" then
    	actual_color = card_data.Color
    end
	if not size then return '' end

	local size_base = size.."px"
	local art_width = tostring(math.ceil(size * (260/512)))
	local art_height = tostring(math.ceil(size * (200/512)))

	local art_pos_top = tostring(math.ceil(size * (60/400)))
	local art_pos_left = tostring(math.ceil(size * (30/235)))
	
	local div_width = (size*(750/960)).."px"
	
	local card_bg = ""
	local card_banner = ""
	local card_frame = ""
	local card_type_back = ""
	local art_img = card_data.UpgradeArtOverride ~= "" and
		card_data.UpgradeArtOverride or
		(card_data.Image:match("(.+)%..+$"):gsub("^StS2_", "StS2_" .. beta_art).."-Art"..".png")
	
	local card_art = card_data.Rarity ~= "Ancient" and "<span style='position: absolute; top: "
		..art_pos_top.."px; left: "..art_pos_left.."px;'>"..
		"[[File:"..art_img.."|"
		..art_width.."x"..art_height.."px".."|class=card-image-part|frameless|link=]]"
		.."</span>" or ""
	
	local card_energy_orb = ""
	-- Get card background
	if card_data.Type == "Curse" then
		card_bg = "[[File:StS2_BgCurse.png|x"..size_base.."|class=card-image-part-bg|frameless|link=]]"
	elseif card_data.Type == "Status" then
		card_bg = "[[File:StS2_BgSkillColorless.png|x"..size_base.."|class=card-image-part-bg|frameless|link=]]" ..
			(name == "Infection" and "[[File:StS2_InfectionOverlay.png|x"..size_base.."|class=card-image-part|frameless|link=]]" or "")
	elseif card_data.Type == "Quest" then
		card_bg = "[[File:StS2_BgQuest.png|x"..size_base.."|class=card-image-part-bg|frameless|link=]]"
	elseif card_data.Rarity == "Ancient" then
		card_bg = getAncientCardBg(card_data.Image, card_data.Type, beta_art, size, size_base)
	else
		local color = actual_color
		if card_data.Rarity == 'Token' then
			color = "Colorless"
		end
		card_bg = "[[File:StS2_Bg"..card_data.Type..color..".png|x"..size_base.."|class=card-image-part-bg|frameless|link=]]"
	end
	-- Get card banner
	if card_data.Rarity == "Basic" or card_data.Rarity == "Token" then
		card_banner = "[[File:StS2_BannerCommon.png|x"..size_base.."|class=card-image-part|frameless|link=]]"
	else
		card_banner = "[[File:StS2_Banner"..card_data.Rarity..".png|x"..size_base.."|class=card-image-part|frameless|link=]]"
	end
	-- Get card type back
	if card_data.Rarity == "Token" or card_data.Rarity == "Basic" then
		card_type_back = "[[File:StS2_TypeCommon.png|x"..size_base.."|class=card-image-part|frameless|link=]]"
	else
		card_type_back = "[[File:StS2_Type"..card_data.Rarity..".png|x"..size_base.."|class=card-image-part|frameless|link=]]"
	end
	-- Get card frame
	if card_data.Type == "Quest" then
		card_frame = "[[File:StS2_FrameQuest.png|x"..size_base.."|class=card-image-part|frameless|link=]]"
	elseif card_data.Type == "Curse" then
		card_frame = "[[File:StS2_FrameCurse.png|x"..size_base.."|class=card-image-part|frameless|link=]]"
	elseif card_data.Type == "Status" then
		card_frame = "[[File:StS2_FrameStatus.png|x"..size_base.."|class=card-image-part|frameless|link=]]"
	elseif card_data.Rarity ~= "Ancient" then
		local rarity = card_data.Rarity 
		if card_data.Rarity == "Basic" or card_data.Rarity == "Special" or card_data.Rarity == "Token" then
			rarity = "Common"
		end
		card_frame = "[[File:StS2_Frame"..card_data.Type..rarity..".png|x"..size_base.."|class=card-image-part|frameless|link=]]"
	end
	-- Get card energy orb 
	if card_data.Type == "Curse" and tonumber(card_data.Cost) ~= -2 then
		card_energy_orb = "[[File:StS2_CardColorlessOrb.png|x"..size_base.."|class=card-image-part|frameless|link=]]"
	elseif actual_color == "Regent" and card_data.StarCost ~= "" then
		card_energy_orb = "[[File:StS2_CardRegentOrb.png|x"..size_base.."|class=card-image-part|frameless|link=]] " ..
			"[[File:StS2_CardStars.png|x"..size_base.."|class=card-image-part|frameless|link=]]"
	elseif tonumber(card_data.Cost) ~= -2 then
		card_energy_orb = "[[File:StS2_Card"..actual_color.."Orb.png|x"..size_base.."|class=card-image-part|frameless|link=]]"
	end
	
	return "<div class='card-image-stack-sts2' style='width:"..div_width.."; height:"..size_base.."'>"..card_art.." "..card_bg.." "..card_frame.." "..card_banner.." "..card_type_back.." "..card_energy_orb.."</div>"
end

function round(num)
    return num >= 0 and math.floor(num + 0.5) or math.ceil(num - 0.5)
end

function getAncientCardBg(card_image, card_type, beta_art, size_num, size)
	local div_width = (size_num*(750/960))
	local art_height = (306/350)*size_num
	local art_width = round((216/274)*div_width, 3)
	local art_pos_top = (23/350)*size_num
	local art_pos_left = (28.43/274)*div_width
	
	local border = "<span style='filter: drop-shadow(0 0 1.5px white)'>[[File:StS2_AncientCardBorder.png|x"..size.."|class=card-image-part|frameless|link=]]</span>"
	local card_art = "<span style='position: absolute; top: "
		..art_pos_top.."px; left: "..art_pos_left.."px; border-radius: 20px'>"..
		"[[File:"..card_image:match("(.+)%..+$"):gsub("^StS2_", "StS2_" .. beta_art).."-Art"..".png|"
		..art_width.."x"..art_height.."px".."|class=card-image-part-full-art|frameless|link=]]"
		.."</span>" or ""
	local art_overlay = "[[File:StS2_AncientCardHighlight.png|x"..size.."|class=card-image-part-ancient-overlay|frameless|link=]]"
	local card_text_bg = "[[File:StS2_AncientTextBg"..card_type..".png|x"..size.."|class=card-image-part|frameless|link=]]"
	
	return card_art.." "..art_overlay.." "..border.." "..card_text_bg
end

function p.NavBoxQuery(frame)
	local color = frame.args[1]
	local game = frame.args[2]
	
	local cacheKey = color..game..'navbox'
	
	local Rarities = cache.get( cacheKey )
	if not Rarities then
		local data = cargo.query('Cards', 'Name, Link=Page, MultiplayerOnly, Rarity', {where = 'Color = "'..color..'" AND Game = "'..game..'" AND Tags HOLDS NOT "NoList"'}) or {}
		Rarities = {
			Basic = {},
			Common = {},
			Uncommon = {},
			Rare = {},
			Ancient = {},
			MultiUncommon = {},
			MultiRare = {},
		}
		local cardLink
		
		for _, card in ipairs(data) do
	    	local displayedName = string.gsub(card.Name, "%b()%s*", "")
	    	cardLink = '<span class="card-trigger inline-trigger" data-name="'..card.Name..'" data-sequel="'..game..'">[['..card.Page..'|'..displayedName..']]</span>'
	    	local key = card.MultiplayerOnly == "1" and ('Multi'..card.Rarity) or card.Rarity
	    	Rarities[key] = Rarities[key] or {}
	    	table.insert(Rarities[key], cardLink)
		end
	end
	cache.set(cacheKey, Rarities)
	
	for rarity, cards in pairs(Rarities) do
	    if #cards > 0 then
	        vars.vardefine(rarity, table.concat(cards, '\n*'))
	    else
	        vars.vardefine(rarity, "")
	    end
	end
end

return p