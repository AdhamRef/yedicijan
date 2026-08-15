"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const node_assert_1 = require("node:assert");
const node_test_1 = require("node:test");
const user_demographics_1 = require("../../lib/dashboard/user-demographics");
/** Fixed "today" so the age maths is deterministic. */
const TODAY = new Date("2026-08-12T00:00:00.000Z");
(0, node_test_1.describe)("normalizeGender", () => {
    (0, node_test_1.test)("recognises every spelling the app writes", () => {
        for (const v of ["male", "Male", "MALE", "m", "ذكر"]) {
            node_assert_1.strict.equal((0, user_demographics_1.normalizeGender)(v), "male", `failed for ${v}`);
        }
        for (const v of ["female", "Female", "f", "أنثى", "انثى"]) {
            node_assert_1.strict.equal((0, user_demographics_1.normalizeGender)(v), "female", `failed for ${v}`);
        }
    });
    (0, node_test_1.test)("free text and preferNotToSay both land in undisclosed", () => {
        node_assert_1.strict.equal((0, user_demographics_1.normalizeGender)("preferNotToSay"), "undisclosed");
        node_assert_1.strict.equal((0, user_demographics_1.normalizeGender)("something else"), "undisclosed");
    });
    (0, node_test_1.test)("empty stays null so 'not recorded' is distinct from 'declined'", () => {
        node_assert_1.strict.equal((0, user_demographics_1.normalizeGender)(null), null);
        node_assert_1.strict.equal((0, user_demographics_1.normalizeGender)(undefined), null);
        node_assert_1.strict.equal((0, user_demographics_1.normalizeGender)("   "), null);
    });
});
(0, node_test_1.describe)("parseGenderParam", () => {
    (0, node_test_1.test)("'all' and empty mean no filter, not 'undisclosed'", () => {
        // normalizeGender("all") would return "undisclosed" — this is the whole
        // reason the param parser is separate.
        node_assert_1.strict.equal((0, user_demographics_1.parseGenderParam)("all"), null);
        node_assert_1.strict.equal((0, user_demographics_1.parseGenderParam)(""), null);
        node_assert_1.strict.equal((0, user_demographics_1.parseGenderParam)(null), null);
    });
    (0, node_test_1.test)("passes through the three real buckets", () => {
        node_assert_1.strict.equal((0, user_demographics_1.parseGenderParam)("male"), "male");
        node_assert_1.strict.equal((0, user_demographics_1.parseGenderParam)("female"), "female");
        node_assert_1.strict.equal((0, user_demographics_1.parseGenderParam)("undisclosed"), "undisclosed");
    });
});
(0, node_test_1.describe)("genderQueryValues", () => {
    (0, node_test_1.test)("male matches the spellings actually stored", () => {
        const v = (0, user_demographics_1.genderQueryValues)("male");
        node_assert_1.strict.ok(v.includes("male"));
        node_assert_1.strict.ok(v.includes("m"));
    });
    (0, node_test_1.test)("undisclosed covers preferNotToSay", () => {
        node_assert_1.strict.ok((0, user_demographics_1.genderQueryValues)("undisclosed").includes("preferNotToSay"));
    });
});
(0, node_test_1.describe)("ageFromBirthdate", () => {
    (0, node_test_1.test)("birthday already passed this year", () => {
        node_assert_1.strict.equal((0, user_demographics_1.ageFromBirthdate)("1990-05-04", TODAY), 36);
    });
    (0, node_test_1.test)("birthday not yet reached this year", () => {
        node_assert_1.strict.equal((0, user_demographics_1.ageFromBirthdate)("1990-12-25", TODAY), 35);
    });
    (0, node_test_1.test)("birthday is today", () => {
        node_assert_1.strict.equal((0, user_demographics_1.ageFromBirthdate)("1990-08-12", TODAY), 36);
    });
    (0, node_test_1.test)("day before birthday", () => {
        node_assert_1.strict.equal((0, user_demographics_1.ageFromBirthdate)("1990-08-13", TODAY), 35);
    });
    (0, node_test_1.test)("junk and empty give null rather than a bogus age", () => {
        node_assert_1.strict.equal((0, user_demographics_1.ageFromBirthdate)(null, TODAY), null);
        node_assert_1.strict.equal((0, user_demographics_1.ageFromBirthdate)("not a date", TODAY), null);
        node_assert_1.strict.equal((0, user_demographics_1.ageFromBirthdate)("1990/05/04", TODAY), null);
        node_assert_1.strict.equal((0, user_demographics_1.ageFromBirthdate)("1990-13-01", TODAY), null);
    });
});
(0, node_test_1.describe)("birthdateRangeForAges", () => {
    (0, node_test_1.test)("no bounds means no clause", () => {
        node_assert_1.strict.equal((0, user_demographics_1.birthdateRangeForAges)(null, null, TODAY), null);
    });
    (0, node_test_1.test)("min age only bounds the upper end of birthdate", () => {
        // age >= 25  <=>  born on or before 2001-08-12
        node_assert_1.strict.deepEqual((0, user_demographics_1.birthdateRangeForAges)(25, null, TODAY), { lte: "2001-08-12" });
    });
    (0, node_test_1.test)("max age only bounds the lower end of birthdate", () => {
        // age <= 34  <=>  born on or after 1991-08-13
        node_assert_1.strict.deepEqual((0, user_demographics_1.birthdateRangeForAges)(null, 34, TODAY), { gte: "1991-08-13" });
    });
    (0, node_test_1.test)("a bracket produces both bounds", () => {
        node_assert_1.strict.deepEqual((0, user_demographics_1.birthdateRangeForAges)(25, 34, TODAY), {
            gte: "1991-08-13",
            lte: "2001-08-12",
        });
    });
    /**
     * The bounds are what actually decide who gets a campaign, so check them
     * against the age function rather than trusting the arithmetic.
     */
    (0, node_test_1.test)("every boundary date agrees with ageFromBirthdate", () => {
        for (const [min, max] of [[25, 34], [35, 44], [45, 54], [18, 18]]) {
            const r = (0, user_demographics_1.birthdateRangeForAges)(min, max, TODAY);
            node_assert_1.strict.equal((0, user_demographics_1.ageFromBirthdate)(r.lte, TODAY), min, `lte of ${min}-${max}`);
            node_assert_1.strict.equal((0, user_demographics_1.ageFromBirthdate)(r.gte, TODAY), max, `gte of ${min}-${max}`);
        }
    });
    (0, node_test_1.test)("one day outside each bound falls out of the bracket", () => {
        const r = (0, user_demographics_1.birthdateRangeForAges)(25, 34, TODAY);
        const dayAfter = (iso) => {
            const d = new Date(`${iso}T00:00:00.000Z`);
            d.setUTCDate(d.getUTCDate() + 1);
            return d.toISOString().slice(0, 10);
        };
        const dayBefore = (iso) => {
            const d = new Date(`${iso}T00:00:00.000Z`);
            d.setUTCDate(d.getUTCDate() - 1);
            return d.toISOString().slice(0, 10);
        };
        node_assert_1.strict.equal((0, user_demographics_1.ageFromBirthdate)(dayAfter(r.lte), TODAY), 24);
        node_assert_1.strict.equal((0, user_demographics_1.ageFromBirthdate)(dayBefore(r.gte), TODAY), 35);
    });
    (0, node_test_1.test)("ISO strings sort lexicographically, which is what makes the range query work", () => {
        const r = (0, user_demographics_1.birthdateRangeForAges)(25, 34, TODAY);
        const inside = "1995-06-01";
        node_assert_1.strict.ok(r.gte <= inside && inside <= r.lte);
        node_assert_1.strict.ok(!("2010-01-01" <= r.lte));
        node_assert_1.strict.ok(!("1980-01-01" >= r.gte));
    });
});
(0, node_test_1.describe)("parseAgeParam", () => {
    (0, node_test_1.test)("accepts sane integers", () => {
        node_assert_1.strict.equal((0, user_demographics_1.parseAgeParam)("0"), 0);
        node_assert_1.strict.equal((0, user_demographics_1.parseAgeParam)("34"), 34);
        node_assert_1.strict.equal((0, user_demographics_1.parseAgeParam)("130"), 130);
    });
    (0, node_test_1.test)("rejects junk instead of clamping it to 0", () => {
        for (const v of ["", "  ", null, undefined, "abc", "-1", "131", "3.5"]) {
            node_assert_1.strict.equal((0, user_demographics_1.parseAgeParam)(v), null, `failed for ${JSON.stringify(v)}`);
        }
    });
});
(0, node_test_1.describe)("formatBirthdateAr", () => {
    (0, node_test_1.test)("renders a readable Arabic month", () => {
        node_assert_1.strict.equal((0, user_demographics_1.formatBirthdateAr)("1990-05-04"), "4 مايو 1990");
    });
    (0, node_test_1.test)("junk gives null so the card shows a dash", () => {
        node_assert_1.strict.equal((0, user_demographics_1.formatBirthdateAr)("nope"), null);
        node_assert_1.strict.equal((0, user_demographics_1.formatBirthdateAr)(null), null);
    });
});
