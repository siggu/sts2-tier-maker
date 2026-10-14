local data = mw.loadData('Module:Cards/StS2_data')
local keyword = require("Module:Keywords")
local p = {}

local function versions(s)
    local base = s:gsub('%[(.-)|(.-)%]', '%1')
    local upg  = s:gsub('%[(.-)|(.-)%]', '%2')

    base = base:gsub('\n', '<br />')
    upg  = upg:gsub('\n', '<br />')
    
    base = "{{Infobox Styling|"..base.."}}"
	upg  = "{{Infobox Styling|"..upg.."}}"

    return base, upg
end

function p.render(frame)
    local html = mw.html.create('div')
    html:tag('div'):attr('id', 'card-filters') -- Change to StS2 filtering id
    local cards = html:tag('div'):attr('id', 'cardsContainer')

    -- build sortable list
    local cardList = {}
    for name, card in pairs(data) do
        table.insert(cardList, {name=name, card=card})
    end

    -- compendium order
    local colorOrder = { Ironclad=1, Silent=2, Regent=3, Necrobinder=4, Defect=5, Colorless=6 }
    local rarityRank = { Basic=1, Common=2, Uncommon=3, Rare=4, Ancient=5, Status=6, Curse=7, Event=8, Quest=9, Token=10 }

    -- sort by colour ----> rarity ----> name
    table.sort(cardList, function(a,b)
        local cA = colorOrder[a.card.Color] or 999
        local cB = colorOrder[b.card.Color] or 999
        if cA ~= cB then return cA < cB end

        local rA = rarityRank[a.card.Rarity] or 999
        local rB = rarityRank[b.card.Rarity] or 999
        if rA ~= rB then return rA < rB end

        return a.name < b.name
    end)

    -- render sorted cards
    for _, entry in ipairs(cardList) do
        local name, card = entry.name, entry.card
        local baseText, upText = versions(card.Text:gsub('<S>', '✦') or '')
        			-- CHANGE gsub once <S> is subtituted with the Regent Star symbol correctly
        local targetPage = card.Link or ('Slay the Spire 2:' .. name) -- Change to StS2 namespace when it happens
        baseText = frame:preprocess(baseText)
        upText   = frame:preprocess(upText)

        local box = cards:tag('div')
            :addClass('card-box')
            :attr('data-rarity', card.Rarity or '')
            :attr('data-type', card.Type or '')
            :attr('data-color', card.Color or '')

        -- image wrapper
        local imgWrap = box:tag('span'):addClass('card-image-wrap')

        -- base image (always present)
        imgWrap:tag('span'):addClass('img-base')
            :wikitext('[[File:' .. card.Image .. '|150px|link=' .. targetPage .. ']]')

        -- upgraded image (only if the card upgrades)
        if not card.NoUpgrade then
            local upgImage = (card.Image or ''):gsub('%.png$', 'Plus.png')
            imgWrap:tag('span'):addClass('img-upg'):css('display','none')
                :wikitext('[[File:' .. upgImage .. '|150px|link=' .. targetPage .. ']]')
            imgWrap:tag('span'):addClass('img-beta-upg'):css('display', 'none')
    			:wikitext('[[File:Beta-' .. upgImage .. '|150px|link=' .. targetPage .. ']]')
        end
        imgWrap:tag('span'):addClass('img-beta'):css('display', 'none')
    		:wikitext('[[File:Beta-' .. card.Image .. '|150px|link=' .. targetPage .. ']]')
    	

        local textWrap = box:tag('div'):addClass('card-text')
        textWrap:tag('div'):addClass('card-title'):wikitext('[[' .. targetPage .. '|' .. name .. ']]')

        textWrap:tag('div')
            :addClass('card-meta')
            :attr('data-rarity', card.Rarity or '')
            :attr('data-color', card.Color or '')
            :attr('data-type', card.Type or '')
            :wikitext((card.Rarity or '') .. ' - ' .. (card.Color or '') .. ' - ' .. (card.Type or ''))

        local desc = textWrap:tag('div'):addClass('card-desc')
        desc:tag('div'):addClass('desc-base'):wikitext(baseText)
        desc:tag('div'):addClass('desc-upg'):css('display','none'):wikitext(upText)

        -- 'card-link' deprecated on CSS

        -- upgrade toggle or "does not upgrade"
        
        if card.NoUpgrade then
           textWrap:tag('div'):addClass('card-toggles')
        		:tag('span')
                	:addClass('upgrade-disabled')
                	:wikitext('This card cannot be Upgraded.')
            	:done()
            	-- Beta art span HERE
        else
        	textWrap:tag('div'):addClass('card-toggles')
	            :tag('span')
	                :addClass('card-toggle-button'):addClass('upgrade-toggle')
	                :attr('role','button')
	                :attr('tabindex','0')
	                :wikitext('Upgraded')
	            :done()
	            -- Beta art span HERE
	        :done()
        end
    end

    return tostring(html)
end

return p