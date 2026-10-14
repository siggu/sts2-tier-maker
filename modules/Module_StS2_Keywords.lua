local data = mw.loadData("Module:StS2_Keywords/data")
local vars = mw.ext.VariablesLua
local p = {}
local default_kw_size = "24px"
local default_icon_size = "20px"

---------------------------------------------------
-- get keyword/icon info and store in variables
---------------------------------------------------
function p.getData(frame)
    local name = frame.args[1] or frame:getParent().args[1]
    name = mw.text.trim(tostring(name))

    local info = (data.Keywords and data.Keywords[name]) or (data.Icons and data.Icons[name]) or {}

    vars.vardefine("keywords_info_name", name)
    vars.vardefine("keywords_info_image", info["Image"] or "")
    vars.vardefine("keywords_info_description", frame:preprocess("{{Infobox Styling|"..(info["Text"] or "").."}}"))
end

---------------------------------------------------
-- escape special chars in lua patterns
---------------------------------------------------
local function escape_pattern(s)
    return mw.ustring.gsub(s, "([%^%$%(%)%%%.%[%]%*%+%-%?])", "%%%1")
end

---------------------------------------------------
-- replace codes like #Vulnerable or @PO in text
---------------------------------------------------
function p.replace(text, hide_icon, label_override, size_override)
    local hide_icon = "false"
    local target_text = ""
    if type(text) == "string" then --type() in Lua returns a string
        target_text = text
    else 
        target_text = text.args[1]
    end
    local keywords_to_replace = {}
    local replacements = {}
    local avoid_indexes = {}
    
    -- icons (@)
    for iconName, icon in pairs(data.Icons or {}) do
        if string.find(target_text, icon.Code) then
            local pattern, _ = escape_pattern(icon.Code)
            table.insert(keywords_to_replace, pattern)
            
            local size = (size_override and size_override ~= "")
                and size_override
                or default_icon_size
            local replacement = string.format(
                "<span class='keyword-trigger' data-name='%s'>[[File:%s|%s|middle|link=]]</span>",
                icon.Code,
                icon.Image,
                size
            )
            
            table.insert(replacements, replacement)
        end
    end

    -- keywords (#)
    for keywordName, keyword in pairs(data.Keywords or {}) do
        local has_found, _ = string.find(target_text, keyword.Code)
        if has_found and target_text[has_found-1] ~= " " then
            -- capture trailing word chars
            local pattern = escape_pattern(keyword.Code) .. "(%w*)"
            table.insert(keywords_to_replace, pattern)

            local size = (size_override and size_override ~= "") and size_override or default_kw_size
            local base_label = (label_override and label_override ~= "") and label_override or keywordName
            local link = keyword.Link or ("Buffs#" .. keywordName)
            local imagePart = ""
            imagePart = keyword.Image and string.format("[[File:%s|%s|middle|link=%s]] ", keyword.Image, size, link) or ""

            -- replacement as a FUNCTION so the suffix goes INSIDE the span
            local function replacement_fn(suffix)
                local label = base_label .. (suffix or "")
                return string.format(
                    "<span class='keyword-trigger inline-trigger' data-name='%s'>%s[[%s|%s]]</span>",
                    keyword.Code:sub(2),
                    imagePart,
                    link,
                    label
                )
            end
            table.insert(replacements, replacement_fn)
        end
    end
    
    -- Fix conflicts like #Orb and #Orb Slot
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

    local keyword = (data.Keywords and data.Keywords[input]) or (data.Icons and data.Icons[input])
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
    local size_override = args[2]
    -- icons (@)
    -- yes this is copied from the replace function thank you Riscuit
    for iconName, icon in pairs(data.Icons or {}) do
        if icon.Code and icon.Image and mw.ustring.sub(icon.Code, 1, 1) == "@" then
            local pattern = escape_pattern(icon.Code)
            local size = (size_override and size_override ~= "")
                and size_override
                or (string.find(icon.Code, "E") and default_kw_size or default_icon_size)
            local replacement = string.format(
                "<span class='keyword-trigger inline-trigger' data-name='%s'>[[File:%s|%s|middle|link=]]&nbsp;</span>",
                icon.Code,
                icon.Image,
                size
            )
            text = mw.ustring.gsub(text, pattern, replacement)
        end
    end
    
    return text
end

-- Gets the corresponding link for a keyword
function p.getLink(frame) 
    local name = frame.args[1]
    local keyword = data.Keywords[name]
    return keyword and keyword["Link"] or "Buffs#"..name
end

return p