local p = {}

local STS2_POWER_MODULES = {
	buff = {
		"Common",
		"Ironclad",
		"Silent",
		"Regent",
		"Necrobinder",
		"Defect",
		"Enemy",
	},
	debuff = {
		"Debuff",
	},
	all = {
		"Common",
		"Ironclad",
		"Silent",
		"Regent",
		"Necrobinder",
		"Defect",
		"Enemy",
		"Debuff",
	},
}

local function mergeInto(result, source)
	for powerName, powerData in pairs(source) do
		result[powerName] = powerData
	end
end

function p.get(mode)
	local moduleNames = STS2_POWER_MODULES[mode] or STS2_POWER_MODULES.all
	local result = {}

	for _, moduleName in ipairs(moduleNames) do
		mergeInto(result, require("Module:Powers/StS2 data/" .. moduleName))
	end

	return result
end

return p