local all_data = {
}

local formatted = {}
for name, keyword in pairs(all_data) do
	keyword.EditLink = "Module:Keywords/StS2_data/Characters"
	formatted[name] = keyword
end

return formatted