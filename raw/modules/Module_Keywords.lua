local vars = mw.ext.VariablesLua
local p = {}
local default_kw_size = "24px"
local default_icon_size = "20px"

---------------------------------------------------
-- get keyword/icon info and store in variables
---------------------------------------------------
function p.getData(frame)
    local name = frame.args[1] --or frame:getParent().args[1]
    local sequel = frame.args[2] or "1"
    name = mw.text.trim(tostring(name))

	local info = {}
	if sequel == "1" then
		local data = mw.loadData('Module:Keywords/data')
		info = (data.Keywords and data.Keywords[name]) or (data.Icons and data.Icons[name]) or {}
	elseif sequel == "2" then
		local data = mw.loadData('Module:Keywords/StS2 data')
		info = (data.Keywords and data.Keywords[name]) or (data.Icons and data.Icons[name]) or {}
	elseif sequel == "B" then
		local data = mw.loadData('Module:Keywords/BG data')
		info = (data.Keywords and data.Keywords[name]) or (data.Icons and data.Icons[name]) or {}
	end

    vars.vardefine("keywords_info_name", name)
    vars.vardefine("keywords_info_image", info["Image"] or "")
    vars.vardefine("keywords_info_description", frame:preprocess("{{Infobox Styling|" .. (info["Text"] or "") .. "|" .. sequel .. "}}"))
    
    vars.vardefine("keywords_info_module", info["EditLink"])
end 

---------------------------------------------------
-- escape special chars in lua patterns
---------------------------------------------------
local function escape_pattern(s)
    return mw.ustring.gsub(s, "([%^%$%(%)%%%.%[%]%*%+%-%?])", "%%%1")
end

---------------------------------------------------
-- replace codes like $Vulnerable or @PO in text
---------------------------------------------------
function p.replace(frame)
    local hide_icon = "false"
    local target_text = frame.args[1]
    local sequel = frame.args[2] or "1"
    -- Unclear if these are actually changed anywhere
    local hide_icon = frame.args[3] or "false"
    local label_override = frame.args[4] or ""
    local size_override = frame.args[5] or ""
    
    local keywords_to_replace = {}
    local replacements = {}
    local avoid_indexes = {}
    
    local actual_data = {}
    if sequel == "1" then
    	actual_data = mw.loadData('Module:Keywords/data')
    elseif sequel == "2" then 
    	actual_data = mw.loadData('Module:Keywords/StS2 data')
    elseif sequel == "B" then 
    	actual_data = mw.loadData('Module:Keywords/BG data')
		default_icon_size = "40px"
    end
    -- icons (@)
    for iconName, icon in pairs(actual_data.Icons or {}) do
        if string.find(target_text, icon.Code) then
            local pattern, _ = escape_pattern(icon.Code)
            table.insert(keywords_to_replace, pattern)
            
            local size = size_override ~= ""
                and size_override
                or default_icon_size
            local replacement = string.format(
                "<span class='keyword-trigger' data-name='%s' data-sequel='%s'>[[File:%s|%s|middle|link=]]</span>",
                icon.Code,
                sequel,
                icon.Image,
                size
            )
            
            table.insert(replacements, replacement)
        end
    end

    -- keywords ($)
    for keywordName, keyword in pairs(actual_data.Keywords or {}) do
        local has_found, _ = string.find(target_text, keyword.Code)
        if has_found and target_text[has_found-1] ~= " " then
            -- capture trailing word chars
            local pattern = escape_pattern(keyword.Code) .. "(%w*)"
            table.insert(keywords_to_replace, pattern)

            local size = (size_override and size_override ~= "") and size_override or default_kw_size
            -- implemented for Transformations that are shorter than the Keyword, specifically for Stunned
            local display_root = (label_override and label_override ~= "") and label_override or keyword.Code:sub(2)
            local link = keyword.Link or ("Slay_the_Spire_2:Keywords#" .. keywordName) or ("Board_Game:Keywords#" .. keywordName)
			if sequel == "2" then
			    link = "Slay_the_Spire_2:" .. link
			elseif sequel == "B" then
			    link = "Board_Game:" .. link
			end
            local imagePart = ""
            imagePart = keyword.Image and string.format("[[File:%s|%s|middle|link=%s]] ", keyword.Image, size, link) or ""

            -- replacement as a FUNCTION so the suffix goes INSIDE the span
            local function replacement_fn(suffix)
                local label = display_root .. (suffix or "")
                return string.format(
                    "<span class='keyword-trigger inline-trigger' data-name='%s' data-sequel='%s'>%s[[%s|%s]]</span>",
                    keywordName,
                    sequel,
                    imagePart,
                    link,
                    label
                )
            end
            table.insert(replacements, replacement_fn)
        end
    end
    
    -- Fix conflicts like $Orb and $Orb Slot
    for i, replace in ipairs(keywords_to_replace) do 
        for k, o_replace in ipairs(keywords_to_replace) do 
            if i ~= k then
                local start, end_index = o_replace:find(replace)
                if start then
                    table.remove(keywords_to_replace, i);
                    table.remove(replacements, i);
                    break
                end
            end
        end
    end
    
    -- Replace everything in one pass
    for index, target in ipairs(keywords_to_replace) do
        local repl = replacements[index]
        if type(repl) == "function" then
            target_text = target_text:gsub(target, repl)        -- uses captured suffix
        else
            target_text = target_text:gsub(target, repl)        -- icons (no captures)
        end
    end

    return target_text
end

function p.process(frame)
    local args = frame.args[1] and frame.args or frame:getParent().args
    local input = args[1] or ""
    local label_override = args[2]
    local size_override = args[3]

    if keyword then
        local size = (size_override and size_override ~= "") and size_override or default_kw_size
        local label = (label_override and label_override ~= "") and label_override or input
        local link = keyword.Link or ("Buffs#" .. input)
        local imagePart = ""
        if keyword.Image and keyword.Image ~= "" then
            imagePart = string.format("[[File:%s|%s|baseline|link=]]", keyword.Image, size)
        end

        return string.format(
            "<span class='keyword-trigger inline-trigger' data-name='%s'>%s [[%s|%s]]</span>",
            input,
            imagePart,
            link,
            label
        )
    end

    return input
end

-- Used for the Icon template
function p.getIcon(frame)
    local args = frame.args[1] and frame.args or frame:getParent().args
    local text = args[1] or ""
    local sequel = args[2] or "1"
    local size_override = args[3]
    
    local actual_data = {}
    if sequel == "1" then
    	actual_data = mw.loadData('Module:Keywords/data')
    elseif sequel == "2" then 
    	actual_data = mw.loadData('Module:Keywords/StS2 data')
    elseif sequel == "B" then 
    	actual_data = mw.loadData('Module:Keywords/BG data')
    end
    -- icons (@)
    -- yes this is copied from the replace function thank you Riscuit
    for iconName, icon in pairs(actual_data.Icons or {}) do
        if icon.Code and icon.Image and mw.ustring.sub(icon.Code, 1, 1) == "@" then
            local pattern = escape_pattern(icon.Code)
            local size = (size_override and size_override ~= "")
                and size_override
                or (string.find(icon.Code, "E") and default_icon_size or default_kw_size)
            local replacement = string.format(
                "<span class='keyword-trigger' data-name='%s' data-sequel='%s'>[[File:%s|%s|middle|link=]]</span>",
                icon.Code,
                sequel,
                icon.Image,
                size
            )
            text = mw.ustring.gsub(text, pattern, replacement)
        end
    end
    
    return text
end

-- Gets the corresponding link for a keyword
function p.getInline(frame) 
    local name = frame.args[1]
    local label = frame.args[2] ~= "" and frame.args[2] or frame.args[1]
    local sequel = frame.args[3] or "1"
    local size_override = frame.args[4] or "22"
    local no_icon = frame.args[5] == "true"
    
	local keyword

    if sequel == "1" then
    	local data = mw.loadData('Module:Keywords/data')
        keyword = (data.Keywords and data.Keywords[name])
               or (data.Icons and data.Icons[name])
    elseif sequel == "2" then
    	local data = mw.loadData('Module:Keywords/StS2 data')
        keyword = (data.Keywords and data.Keywords[name]) 
               or (data.Icons and data.Icons[name])
    elseif sequel == "B" then
    	local data = mw.loadData('Module:Keywords/BG data')
        keyword = (data.Keywords and data.Keywords[name]) 
               or (data.Icons and data.Icons[name])
    end
    
    local resolved_link = keyword and keyword["Link"] or "Keywords#"..name
    if sequel == "2" then
        resolved_link = "Slay_the_Spire_2:" .. resolved_link
    elseif sequel == "B" then
        resolved_link = "Board_Game:" .. resolved_link
    end
    
    local link = "[["..resolved_link.."|"..label.."]]"
    if not keyword then
    	return '[[File:ErrorImage.png|'..size_override..'px|link='..resolved_link..']] '.. link
    end
    
    local icon = ""
    if keyword.Image and not no_icon then
    	icon = '[[File:'..keyword.Image..'|'..size_override..'px|link='..resolved_link..']] '
    end
    
        local Inline = icon .. link

    if keyword.NoTooltip then
        return Inline
    end

    return '<span class="keyword-trigger inline-trigger" data-name="' .. name .. '" data-sequel="' .. sequel .. '" title="">' .. Inline .. '</span>'
end

return p