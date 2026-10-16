local vars = mw.ext.VariablesLua
local cargo = mw.ext.cargo
local cache = require 'mw.ext.LuaCache'
-----------------------------------------------------------------------------

local function getRelicData(name, sequel)
	local fields = 'Name, Image, ExclusiveTo, Rarity, Cost, Description, Flavor'
    local query_results = cargo.query('Relics', fields, { 
    	where = 'Relics.Name = "' .. name .. '" AND Relics.Game = "' .. sequel .. '"'
    })
    local data = query_results[1] or -1
    return data
end

local p = {}

function p.defineVariables(frame) 
	local name = frame.args[1] or ""
	local sequel = frame.args[2] or "1"
	
	local relic_data = getCargoData(name, sequel)
	if relic_data == -1 then
		return ""
	end
	
	vars.vardefine("relic_rarity", relic_data["Rarity"])
	vars.vardefine("relic_character", relic_data["Character"] or "Any")
	vars.vardefine("relic_image", relic_data["Image"])
	vars.vardefine("relic_description", frame:preprocess(relic_data["Description"]))
	vars.vardefine("relic_cost", relic_data["Cost"])
	vars.vardefine("relic_flavor", relic_data["Flavor"])
end

function p.getInline(frame)
	local name = frame.args[1] or frame:getParent().args[1]
	local label = frame.args[2] ~= "" and frame.args[2] or frame.args[1]
	local sequel = frame.args[3] or "1"
	local no_icon = frame.args[4] == "true"
	name = mw.text.trim(tostring(name))
    local query_results = cargo.query('Relics', 'Name, Image, Link', { where = 'Relics.Name = "' .. name .. '" AND Relics.Game = "' .. sequel .. '"' })
    local relic = query_results[1] or false
	
	if not relic then
		local link = (sequel=="2" and "Slay the Spire 2:" or "").. name
		return '[[File:ErrorImage.png|24px|middle|link='.. link ..']] [['..link..'|'..label..']]'
	end
	
	if no_icon then
		return "[["..relic.Link.."|"..label.."]]"
	end
	return "[[File:"..relic.Image.."|24px|middle|link="..relic.Link.."]] " .. "[["..relic.Link.."|"..label.."]]"
end

function p.NavBoxQuery(frame)
	
	local cacheKey = 'Relic2Navbox'
	local Rarities = cache.get(cacheKey)
	
	if not Rarities then
		local data = cargo.query('Relics', 'Name, Link=Page, Rarity, ExclusiveTo, Image, AncientSource, EventSource, Tags', {
			where = 'Game = "2" AND NOT Tags HOLDS "NoList"',
			orderBy = "Rarity ASC, Name ASC"
		}) or {}
	    local rarityRank = { Starter=1, Common=2, Uncommon=3, Rare=4, Boss=5, Ancient=6, Shop=7, Event=8, Blight=9, Special=10 }
	    local colorOrder = { Any=1, Ironclad=2, Silent=3, Regent=4, Necrobinder=5, Defect=6, Watcher=7 }
	    table.sort(data, function(a,b)
	        local rA = rarityRank[a.Rarity] or 999
	        local rB = rarityRank[b.Rarity] or 999
	        if rA ~= rB then return rA < rB end
	        local cA = colorOrder[a.ExclusiveTo] or 1
	        local cB = colorOrder[b.ExclusiveTo] or 1
	        if cA ~= cB then return cA < cB end
	        if a.Rarity == "Starter" and b.Rarity == "Starter" then
				local sA = string.find(a.Tags or "", "AncientUpgrade") and 2 or 1
		        local sB = string.find(b.Tags or "", "AncientUpgrade") and 2 or 1
	        	if sA and sB and sA ~= sB then
	            	return sA < sB
	        	end
	        end
	        if a.EventSource and b.EventSource and a.EventSource ~= b.EventSource then
	        	return a.EventSource < b.EventSource
	        end
	        return a.Name < b.Name
	    end)
		
		Rarities = {
			IroncladStarter = {},
			SilentStarter = {},
			RegentStarter = {},
			NecrobinderStarter = {},
			DefectStarter = {},
			WatcherStarter = {},
			Common = {},
			CharCommon = {},
			Uncommon = {},
			CharUncommon = {},
			Rare = {},
			CharRare = {},
			Boss = {},
			CharBoss = {},
			Neow = {},
			Orobas = {},
			Pael = {},
			Tezcatara = {},
			Nonupeipe = {},
			Tanx = {},
			Vakuu = {},
			Darv = {},
			Shop = {},
			CharShop = {},
			Event = {},
			Special = {}
		}
		local relicLink
		local key
		for _, relic in ipairs(data) do
			relicLink =  '<span class="relic-trigger inline-trigger" data-name="'..relic.Name..'" data-sequel="2">[[File:'..relic.Image..'|24px|middle|link='..relic.Page..']] [['..relic.Page..'|'..relic.Name..']]</span>'
			if relic.Rarity == 'Starter' then
				key = relic.ExclusiveTo..relic.Rarity
			elseif relic.ExclusiveTo ~= 'Any' then
				key = 'Char'..relic.Rarity
			elseif relic.Rarity == 'Ancient' then
				key = relic.AncientSource
			else
				key = relic.Rarity
			end
			if Rarities[key] then
				table.insert(Rarities[key], relicLink)
			end
		end
	end
	cache.set(cacheKey, Rarities)
	
	for rarity, relics in pairs(Rarities) do
		vars.vardefine(rarity, #relics > 0 and table.concat(relics, '\n*') or "")
	end
end

return p