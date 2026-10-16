local vars = mw.ext.VariablesLua
local cargo = mw.ext.cargo
local p = {}

function getData(version, sequel)
	local fields = '_pageName=Page, Version, Type, ReleaseDate'
    local query_results = cargo.query('Patches', fields, { where = 'Patches.Version = "' .. version .. '" AND Patches.Sequel = "' .. sequel .. '"' })
    local data = query_results[1] or -1
    return data
end

function ordinal_numbers(n)
  local n_str = tostring(n)
  local ordinal, digit = {"st", "nd", "rd"}, tonumber(string.sub(n_str, -1))
  local last_two = tonumber(string.sub(n_str, -2))
  
  if digit and digit >= 1 and digit <= 3 and last_two ~= 11 and last_two ~= 12 and last_two ~= 13 then
    return n_str .. ordinal[digit]
  else
    return n_str .. "th"
  end
end

function formatDate(date)
	_,_,Year,Month,Day=string.find(date, "(%d+)-(%d+)-(%d+)")
	local months = { "January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December" }
	return months[tonumber(Month)].." "..ordinal_numbers(tonumber(Day))..", "..Year
end

function p.formatDate(frame)
	local date = frame.args[1]
	return formatDate(date)
end

local function getBasePageName(page_name)
	if not page_name:find(":", 1, true) then
		return page_name
	end
	
	local formatted, _ = string.gsub(page_name, "[^:]*:", "")
	return formatted
end

function p.PatchNav(frame)
	local version = frame.args[1]
	local sequel = frame.args[2]
	local date = frame.args[3]
	if version == "" then
		vars.vardefine("PatchCargo", 0)
		return
	end
	vars.vardefine("PatchCargo", 1)
	local prevP = (cargo.query('Patches', '_pageName', {where = 'Sequel = "'..sequel..'" AND ((ReleaseDate <= "' .. date .. '" AND Version < "'.. version ..'") OR ReleaseDate < "' .. date .. '")', orderBy = 'ReleaseDate DESC, Version DESC', limit = 1})[1] or {})._pageName or false
	local nextP = (cargo.query('Patches', '_pageName', {where = 'Sequel = "'..sequel..'" AND ((ReleaseDate >= "' .. date .. '" AND Version > "'.. version ..'") OR ReleaseDate > "' .. date .. '")', orderBy = 'ReleaseDate ASC, Version ASC', limit = 1})[1] or {})._pageName or false
	if prevP then
		vars.vardefine("PatchPreviousLink", prevP)
		vars.vardefine("PatchPrevious", getBasePageName(prevP))
	end
	if nextP then
		vars.vardefine("PatchNextLink", nextP)
		vars.vardefine("PatchNext", getBasePageName(nextP))
	end
	vars.vardefine("PatchDate", formatDate(date))
end

function p.getVersionLink(frame)
	local page_name = frame.args[1] or ""
	if page_name == "" then return end
	
	local formatted_name = getBasePageName(page_name)
	local namespace = frame:preprocess("{{NAMESPACE}}")
	
	local version_number = formatted_name:match("^(.-) %- ")
	
	return "[["..namespace..":"..formatted_name.."|"..version_number.."]]"
end

function p.tableClear()
	vars.vardefine("patchDate", "")
	vars.vardefine("patchDateRaw", "")
	vars.vardefine("patchVersion", "")
	vars.vardefine("patchType", "")
	vars.vardefine("patchPage", "")
end

function p.tableRow(frame)
	local version = frame.args[1]
	local sequel = frame.args[2]
	
	data = getData(version, sequel)
	if data == -1 then return end
	
	local nextMajor = (cargo.query('Patches', '_pageName=Page, Version, Type, ReleaseDate', {where = 'Patches.Type = "Major Update" AND Patches.ReleaseDate >"'..data.ReleaseDate..'" AND "'..data.ReleaseDate..'"> "2026-03-05"', orderBy='ReleaseDate ASC', limit=1})[1]) or false
	if nextMajor and data.Type ~= "Major Update" then
		vars.vardefine("nextMajor", nextMajor.Version)
		vars.vardefine("nextMajorRow", "\n|-\n| style=\"white-space: nowrap;\" | " .. nextMajor.Type .. "\n| [[" .. nextMajor.Page .. "|" .. nextMajor.Version .. "]]\n| " .. formatDate(nextMajor.ReleaseDate) .. "\n|\n* Changes from beta branch incorporated into main branch")
	end
	
	vars.vardefine("patchDate", formatDate(data.ReleaseDate))
	vars.vardefine("patchDateRaw", data.ReleaseDate)
	vars.vardefine("patchVersion", version)
	vars.vardefine("patchType", data.Type)
	vars.vardefine("patchPage", "[["..data.Page.."|"..version.."]]")
end

return p