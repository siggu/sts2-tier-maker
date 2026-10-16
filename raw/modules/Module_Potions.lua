local cargo = mw.ext.cargo
local vars = mw.ext.VariablesLua
local p = {}

function getCargoData(name, sequel)
	local fields = 'Link, Name, Image, Rarity, ExclusiveTo=Character, Description'
	local query_results = cargo.query('Potions', fields, { where = 'Potions.Name = "' .. name .. '" AND Potions.Game = "' .. sequel .. '"' })
	return query_results[1]
end

function p.getCombinedDescription(frame)
	local description = frame.args[1]
	
	-- Pattern to match (base_stat;upgraded_stat)
	local result, _ = string.gsub(description, "%((.-);(.-)%)", function(base, gold)
		local gold_formatted = gold ~= "" and (" ({{R|Sacred Bark|"..gold.."|noicon=true}})") or ""
		return base..gold_formatted
	end)
	return frame:preprocess(result)
end

function p.getInline(frame)
	local name = mw.text.trim(tostring(frame.args[1]))
	local label = frame.args[2] ~= "" and frame.args[2] or frame.args[1]
	local sequel = frame.args[3] or "1"
	local potion = getCargoData(name, sequel)
	
	if not potion then
		local link = (sequel=="2" and "Slay the Spire 2:" or "").. name
		return '[[File:ErrorImage.png|24px|middle|link='.. link ..']] [['..link..'|'..label..']]'
	end
	
	local image = "[[File:" .. (potion.Image or "") .. "|24px|middle|link=" .. potion.Link .. "]]"
	local link = "[["..potion.Link.."|"..label.."]]"
	
	return '<span class="inline-trigger potion-trigger" data-name="'.. name ..'" data-sequel="'.. sequel ..'">'..image..' '..link..'</span>'
end

function p.defineVariables(frame) 
	local name = frame.args[1] or ""
	local sequel = frame.args[2] or "1"
	
	local potion_data = getCargoData(name, sequel) or {}
	
	vars.vardefine("potion_rarity", potion_data["Rarity"] or "Common")
	vars.vardefine("potion_character", potion_data["Character"] or "Any")
	vars.vardefine("potion_image", potion_data["Image"] or "")
	vars.vardefine("potion_description", frame:preprocess(potion_data["Description"] or ("Cargo data for "..name.." is missing!")))
end

return p