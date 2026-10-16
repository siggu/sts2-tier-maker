local data = mw.loadData('Module:Events/StS2_data')
local p = {}

local function normalizeActs(act)
    if type(act) == 'table' then
        local out = {}
        for _, v in ipairs(act) do
            table.insert(out, tostring(v))
        end
        return out
    elseif type(act) == 'string' then
        local out = {}
        table.insert(out, act)
        return out
    else
        return {}
    end
end

local function actSortKey(act)
    local acts = normalizeActs(act)
    local minv = 0
    for _, v in ipairs(acts) do
        local n = tonumber(v:match('%d+')) or 0
        if minv == 0 or n < minv then minv = n end
    end
    return minv -- 0 is "All Acts"
end

function p.render(frame)
    local html = mw.html.create('div')
    html:tag('div'):attr('id', 'event-filters')
    local events = html:tag('div'):attr('id', 'eventsContainer'):attr('data-sequel', frame.args[1] or '1')

    -- sort by earliest act ---> name
    local eventList = {}
    for name, ev in pairs(data) do
        table.insert(eventList, { name = name, ev = ev })
    end
    table.sort(eventList, function(a, b)
        local aKey = actSortKey(a.ev.Act)
        local bKey = actSortKey(b.ev.Act)
        if aKey ~= bKey then return aKey < bKey end
        return a.name < b.name
    end)

    for _, entry in ipairs(eventList) do
        local name, ev = entry.name, entry.ev
        local acts = normalizeActs(ev.Act)
        local targetPage = ev.Link or name

        local box = events:tag('div')
            :addClass('event-box')

        -- data-* for js
        if #acts > 0 then
            box:attr('data-act', table.concat(acts, ','))
        end
        box:attr('data-shrine', ev.Shrine and 'true' or 'false')

        local imgWrap = box:tag('span'):addClass('event-image-wrap')
        if ev.Image and ev.Image ~= '' then
            imgWrap:tag('span')
                :addClass('img-base')
                :wikitext('[[File:' .. ev.Image .. '|120px|link=Slay_the_Spire_2:' .. targetPage .. ']]')
        end

        local textWrap = box:tag('div'):addClass('event-text')
        textWrap:tag('div'):addClass('event-title'):wikitext('[[Slay_the_Spire_2:' .. targetPage .. '|' .. name .. ']]')

        -- meta with filter spans
        local meta = textWrap:tag('div'):addClass('event-meta')
        if #acts == 0 then
            meta:tag('span')
                :addClass('act-filter')
                :attr('data-act', 'All Acts')
                :wikitext('All Acts')
        else
            for i, a in ipairs(acts) do
                if i > 1 then meta:wikitext(', ') end
                meta:tag('span')
                    :addClass('act-filter')
                    :attr('data-act', a)
                    :wikitext('Act ' .. a)
            end
        end
        if ev.Shrine then
            meta:wikitext(' - ')
            meta:tag('span')
                :addClass('shrine-filter')
                :attr('data-shrine', 'Yes')
                :wikitext('Shrine')
        end

        if ev.Description and ev.Description ~= '' then
            textWrap:tag('div'):addClass('event-desc'):wikitext(frame:preprocess(ev.Description))
        end
        if ev.Flavor and ev.Flavor ~= '' then
            textWrap:tag('div'):addClass('event-flavor'):wikitext(ev.Flavor)
        end

        -- 'event-link' deprecated on CSS
    end

    return tostring(html)
end

return p