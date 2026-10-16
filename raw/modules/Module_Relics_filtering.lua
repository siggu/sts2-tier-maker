local cargo = mw.ext.cargo
local p = {}

function getCargoRelicData(sequel)
	local fields = 'Relics.Link=Link, Relics.Name=Name, Relics.Image=Image, Relics.ExclusiveTo=Character, Relics.Rarity=Rarity, Relics.AncientSource=AncientSource, Relics.EventSource=EventSource, Relics.Cost=Cost, Relics.Description=Description, Relics.Flavor=Flavor, Relics.Tags=Tags, IF(CONCAT(Relics.Tags__full) LIKE "%AncientUpgrade%", 1, 0)=AncientUpgrade'
    local query_results = cargo.query(
    	'Relics, SortingOrder=ColorSort, SortingOrder=RaritySort, SortingOrder=AncientSort',
    	fields,
    	{ 
    		where = 'Relics.Game = "' .. sequel .. '" AND NOT Relics.Tags HOLDS "NoList" AND ColorSort.Field = "Character" AND RaritySort.Field = "Rarity" AND AncientSort.Field = "Source"', 
    		join = 'Relics.ExclusiveTo=ColorSort.Name, Relics.Rarity=RaritySort.Name, Relics.AncientSource=AncientSort.Name',
    		orderBy = 'RaritySort.SortOrder ASC, ColorSort.SortOrder ASC, AncientUpgrade ASC, AncientSort.SortOrder ASC, Relics.EventSource ASC, Relics.Name ASC'
    	})
    local data = {}
    
    local keywords = cargo.query('KeywordPowerSources', 'ID, Name', {
    	where = 'Game = "'..sequel..'" AND Type = "Relic"'
    })
    
    local keywordsList = {}
    for _, keyword in ipairs(keywords) do
    	if keywordsList[keyword.Name] then
    		keywordsList[keyword.Name] = keywordsList[keyword.Name]..' '..keyword.ID
    	else
    		keywordsList[keyword.Name] = keyword.ID
    	end
    end
    
    for _, relic in pairs(query_results) do
    	relic.Keywords = keywordsList[relic.Name] or ''
        table.insert(data, {name=relic.Name, relic=relic})
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

function p.render(frame)
	local sequel = frame.args[1] or "1"
    local html = mw.html.create('div')
    html:tag('div'):attr('id', 'relic-filters')

    -- build sortable list, excludes cards that have existing cargo data
    local relicList = getCargoRelicData(sequel)
    
    local results = html:tag('div'):attr('id', 'results')
    results:tag('div'):attr('id', 'sortingResults'):wikitext("Default sorting")
    results:tag('div'):attr('id', 'numResults'):wikitext("Showing " .. #relicList .. " results")
    
    local relics = html:tag('div'):attr('id', 'relicsContainer'):addClass('list-container'):attr('data-sequel', sequel)

    for _, entry in ipairs(relicList) do
        local name, relic = entry.name, entry.relic
        local box = relics:tag('div')
            :addClass('relic-box')
            :attr('data-name', entry.name)
            :attr('data-rarity', relic.Rarity)
            :attr('data-character', relic.Character)
            :attr('data-ancient-upgrade', string.find(relic.Tags or "", "AncientUpgrade") and "Yes" or "No")
            :attr('data-sequel', sequel or '1')
            :attr('data-tags', relic.Keywords)
        local targetPage = relic.Link or (sequel == "2" and "StS2:" or "") .. name

        if relic.Requirement then
            box:attr('data-requirement', mw.text.jsonEncode(relic.Requirement))
        end
        if relic.AncientSource ~= "-" and relic.Rarity == "Ancient" then
        	box:attr('data-ancient', relic.AncientSource)
        end

        local imgWrap = box:tag('span'):addClass('relic-image-wrap')
        imgWrap:tag('span'):addClass('img-base'):wikitext('[[File:' .. relic.Image .. '|80px|link=' .. targetPage .. ']]')

        local textWrap = box:tag('div'):addClass('relic-text')
        textWrap:tag('div'):addClass('relic-title'):addClass('compendium-cell-title')
        	:wikitext('[[' .. targetPage .. '|' .. name .. ']]')

        local colorMap = { Ironclad = "Ironclad", Silent = "Silent", Defect = "Defect", Watcher = "Watcher", Colorless = "Colorless" }
        local metaText
		if relic.Rarity == "Ancient" then
    		metaText = (relic.Rarity or '') .. ' - ' .. (relic.AncientSource or 'Unknown')
		else
    		metaText = (relic.Rarity or '') .. ' - ' .. (colorMap[relic.Character] or relic.Character)
		end

		textWrap:tag('div'):addClass('relic-meta')
    		:wikitext(metaText)

        local desc = textWrap:tag('div'):addClass('relic-desc'):addClass('compendium-cell-desc')
        desc:tag('div'):addClass('relic-desc'):wikitext(frame:preprocess(relic.Description))
        desc:tag('div'):addClass('relic-flavor'):wikitext(relic.Flavor or "Details for this relic will be revealed in the future...")

        -- Relic requirements do not appear unless a 'relic-link' div is appended. TODO: fix the CSS
        textWrap:tag('div'):addClass('relic-link')
    end

    return tostring(html)
end

return p