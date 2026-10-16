local cargo = mw.ext.cargo
local p = {}

function getCargoPotionData(sequel)
	local fields = 'Potions.Link=Page, Potions.Name=Name, Potions.Image=Image, Potions.ExclusiveTo=Character, Potions.Rarity=Rarity, Potions.Description=Text'
    local query_results = cargo.query(
        'Potions, SortingOrder=ColorSort, SortingOrder=RaritySort',
        fields,
        { 
            where = 'Potions.Game = "' .. sequel .. '" AND ColorSort.Field = "Character" AND RaritySort.Field = "Rarity"', 
            join = 'Potions.ExclusiveTo=ColorSort.Name, Potions.Rarity=RaritySort.Name',
            orderBy = 'RaritySort.SortOrder ASC, ColorSort.SortOrder ASC, Potions.Name ASC'
        })
    local data = {}
    
    
    local keywords = cargo.query('KeywordPowerSources', 'ID, Name', {
    	where = 'Game = "'..sequel..'" AND Type = "Potion"'
    })
    
    local keywordsList = {}
    for _, keyword in ipairs(keywords) do
    	if keywordsList[keyword.Name] then
    		keywordsList[keyword.Name] = keywordsList[keyword.Name]..' '..keyword.ID
    	else
    		keywordsList[keyword.Name] = keyword.ID
    	end
    end
    
    for _, potion in pairs(query_results) do
    	potion.Keywords = keywordsList[potion.Name] or ''
        table.insert(data, {name=potion.Name, potion=potion})
    end
    return data
end

local function dataExists(list, name)
	for _, entry in ipairs(list) do
		if entry.name == name then
			return true
		end
	end
	return false
end

function get_description(input)
    -- Pattern to match [base_stat|upgraded_stat]
    local result, _ = string.gsub(input, "%((.-);(.-)%)", function(base, gold)
        return base.." (<span class=stat-golden>[[Sacred Bark|"..gold.."]]</span>)"
    end)
    return result
end

function p.render(frame)
	local sequel = frame.args[1] or "1"
    local html = mw.html.create('div')
    html:tag('div'):attr('id', 'potion-filters')
	
    local potionList = getCargoPotionData(sequel)

    local results = html:tag('div'):attr('id', 'results')
    results:tag('div'):attr('id', 'sortingResults'):wikitext("Default sorting")
    results:tag('div'):attr('id', 'numResults'):wikitext("Showing " .. #potionList .. " results")
    
    local potions = html:tag('div'):attr('id', 'potionsContainer'):addClass('list-container'):attr('data-sequel', sequel)

    -- render sorted cards
    for _, entry in ipairs(potionList) do
        local name, potion = entry.name, entry.potion

        local box = potions:tag('div')
            :addClass('potion-box')
            :attr('data-name', entry.name)
            :attr('data-rarity', potion.Rarity or '')
            :attr('data-character', potion.Character)
            :attr('data-tags', potion.Keywords)

        local imgWrap = box:tag('span'):addClass('potion-image-wrap')
        imgWrap:tag('span')
            :addClass('img-base')
            :wikitext('[[File:' .. potion.Image .. '|80px|link='..potion.Page..']]')

        local textWrap = box:tag('div'):addClass('potion-text')
        textWrap:tag('div'):addClass('potion-title'):addClass('compendium-cell-title')
        	:wikitext("[["..potion.Page.."|"..name.."]]")
        textWrap:tag('div'):addClass('potion-meta')
            :wikitext((potion.Rarity or '') .. ' - ' .. potion.Character)

        local desc = textWrap:tag('div'):addClass('potion-desc')
		if sequel == "1" then
    		desc:tag('div'):addClass('potion-desc'):addClass('compendium-cell-desc')
    			:wikitext(get_description(frame:preprocess(potion.Text)))
		else
    		desc:tag('div'):addClass('potion-desc'):addClass('compendium-cell-desc')
    			:wikitext(get_description(potion.Text))
		end
    end
    return tostring(html)
end

return p