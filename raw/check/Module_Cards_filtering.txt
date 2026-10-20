local cargo = mw.ext.cargo
local p = {}

local function versions(description, sequel)
	local pattern = "%((.-);(.-)%)"
	
    local base = description:gsub(pattern, '%1')
    local upg  = description:gsub(pattern, '%2')

    base = base:gsub('\n', '<br />')
    upg  = upg:gsub('\n', '<br />')

    return base, upg
end

local function cargoBool(bool)
    -- Assigning to a boolean value, cargo booleans are either "1" or "0"
	if bool == "1" then
		return true
	end
	return false
end

function getCargoCardData(sequel)
	local fields = 'Cards.Link=Link, Cards.Name=Name, Cards.Image=Image, Cards.Color=Color, Cards.OverrideColor=OverrideColor, Cards.Type=Type, Cards.Rarity=Rarity, Cards.Cost=Cost, Cards.CostPlus=CostPlus, Cards.StarCost=StarCost, Cards.NoUpgrade=NoUpgrade, Cards.Description=Description, Cards.MultiplayerOnly=MultiplayerOnly, Cards.HasBeta=HasBeta'
    local query_results = cargo.query('Cards, SortingOrder=ColorSort, SortingOrder=RaritySort', fields, {
    	where = 'Cards.Game = "' .. sequel .. '" AND NOT (Cards.Tags HOLDS "NoList") AND ColorSort.Field="Color" AND RaritySort.Field="Rarity"',
    	join='Cards.OverrideColor=ColorSort.Name, Cards.Rarity=RaritySort.Name',
    	orderBy='ColorSort.SortOrder ASC, RaritySort.SortOrder ASC, Cards.Name ASC'
    })
    
    
    local keywords = cargo.query('KeywordPowerSources', 'ID, Name', {
    	where = 'Game = "'..sequel..'" AND Type = "Card"'
    })
    
    local keywordsList = {}
    for _, keyword in ipairs(keywords) do
    	if keywordsList[keyword.Name] then
    		keywordsList[keyword.Name] = keywordsList[keyword.Name]..' '..keyword.ID
    	else
    		keywordsList[keyword.Name] = keyword.ID
    	end
    end
    
    local data = {}
    for _, card in pairs(query_results) do
    	card.Keywords = keywordsList[card.Name] or ""
    	
    	card.NoUpgrade = cargoBool(card.NoUpgrade)
    	card.MultiplayerOnly = cargoBool(card.MultiplayerOnly)
    	card.HasBeta = cargoBool(card.HasBeta)
    	
        table.insert(data, {name=card.Name, card=card})
    end
    return data
end

-- Keeping this function just in case its needed for some functionality for handling missing Cargo data
local function dataExists(cardlist, name)
	for _, card in ipairs(cardlist) do
		if card.name == name then
			return true
		end
	end
	return false
end

function p.render(frame)
	local sequel = frame.args[1] or "1"
    local html = mw.html.create('div')
    html:tag('div'):attr('id', 'card-filters')

    -- build sortable list, excludes cards that have existing cargo data
    local cardList = getCargoCardData(sequel)
    
    local results = html:tag('div'):attr('id', 'results')
    results:tag('div'):attr('id', 'sortingResults'):wikitext("Default sorting")
    results:tag('div'):attr('id', 'numResults'):wikitext("Showing " .. #cardList .. " results")
    
    local cards = html:tag('div'):attr('id', 'cardsContainer'):addClass('list-container'):attr('data-sequel', sequel)

    -- render sorted cards
    local colorMap = { Red="Ironclad", Green="Silent", Blue="Defect", Purple="Watcher", Colorless="Colorless" }

    for _, entry in ipairs(cardList) do
        local name, card = entry.name, entry.card
        local isCargo = card.Description and true or false
        local baseText, upText = versions(card.Text or card.Description or '', sequel)
        baseText = frame:preprocess(baseText)
        upText   = frame:preprocess(upText)
        
        local targetPage = card.Link or name
        
        local stringCost = tostring(card.Cost);
        if stringCost == "-1" then
        	stringCost = "X";
        elseif stringCost == "-2" then
        	stringCost = "Unplayable"
        end
        
        local stringStarCost = tostring(card.StarCost or "");
        if stringStarCost == "-1" then
        	stringStarCost = "X";
        end

        local box = cards:tag('div')
            :addClass('card-box')
            :attr('data-name', entry.name)
            :attr('data-rarity', card.Rarity or '')
            :attr('data-type', card.Type or '')
            :attr('data-color', card.Color or '')
            :attr('data-canupgrade', card.NoUpgrade and "false" or "true")
            :attr('data-hasbeta', card.HasBeta and "true" or "false")
            :attr('data-cost', stringCost)
            :attr('data-multiplayer', card.MultiplayerOnly and "true" or "false")
            :attr('data-tags', card.Keywords)
        if stringStarCost ~= "" then
        	box:attr('data-starcost', stringStarCost)
        end

        -- image wrapper
        local imgWrap = box:tag('span'):addClass('card-image-wrap')

        -- base image (always present)
        imgWrap:tag('span'):addClass('img-base')
            :wikitext('[[File:' .. card.Image .. '|150px|link=' .. targetPage .. ']]')

        -- upgraded image (only if the card upgrades)
        if not card.NoUpgrade then
            local upgImage = (card.Image or ''):gsub('%.png$', 'Plus.png'):gsub('%.gif$', 'Plus.gif')
            imgWrap:tag('span'):addClass('img-upg'):css('display','none')
                :wikitext('[[File:' .. upgImage .. '|150px|link=' ..  targetPage .. ']]')
            if card.HasBeta then
	            imgWrap:tag('span'):addClass('img-beta-upg'):css('display', 'none')
	    			:wikitext('[[File:' .. (sequel == "2" and upgImage:gsub("^StS2_", "StS2_Beta-") or "Beta-" .. upgImage) .. '|150px|link=' .. targetPage .. ']]')
        	end
        end
        
        if card.HasBeta then
	        imgWrap:tag('span'):addClass('img-beta'):css('display', 'none')
	    		:wikitext('[[File:' .. (sequel == "2" and card.Image:gsub("^StS2_", "StS2_Beta-") or "Beta-" .. card.Image) .. '|150px|link=' .. targetPage .. ']]')
	    end

        local textWrap = box:tag('div'):addClass('card-text')
        textWrap:tag('div'):addClass('card-title'):addClass('compendium-cell-title')
        	:wikitext('[[' .. targetPage .. '|' .. name .. ']]')

        textWrap:tag('div')
            :addClass('card-meta')
            :attr('data-rarity', card.Rarity or '')
            :attr('data-color', card.Color or '')
            :attr('data-type', card.Type or '')
            :wikitext((card.Rarity or '') .. ' - ' .. (colorMap[card.Color] or card.Color or '') .. ' - ' .. (card.Type or ''))

        local desc = textWrap:tag('div'):addClass('card-desc'):addClass('compendium-cell-desc')
        desc:tag('div'):addClass('desc-base'):wikitext(baseText)
        desc:tag('div'):addClass('desc-upg'):css('display','none'):wikitext(upText)
        -- upgrade toggle or "does not upgrade"
        
        local toggles = textWrap:tag('div'):addClass('card-toggles')
		if card.NoUpgrade then
			toggles:tag('span')
				:addClass('upgrade-disabled')
				:wikitext('Cannot be Upgraded')
		else
			toggles:tag('span')
				:addClass('card-toggle-button upgrade-toggle')
				:attr('role', 'button')
				:attr('tabindex', '0')
				:wikitext('Upgraded')
		end
		
		if card.HasBeta then
			toggles:tag('span')
				:addClass('card-toggle-button'):addClass('beta-toggle')
				:attr('role', 'button')
				:attr('tabindex', '1')
				:wikitext('Beta Art')
		else
			toggles:tag('span')
				:addClass('upgrade-disabled')
				:wikitext('No Beta Art')
		end
    
	    if card.MultiplayerOnly then
	    	box:tag('div')
	            :addClass('infobox-edit-button')
	            :addClass('noselect')
	            :css('color', 'gray')
	            :wikitext("Multiplayer Only")
	    end
    end

    return tostring(html)
end

return p