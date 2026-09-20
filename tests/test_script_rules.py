import json
import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'tools'))
from script_rules import parse_line


class ScriptRulesTest(unittest.TestCase):
    def test_shared_contract(self):
        cases = json.loads(Path(__file__).with_name('script-rule-cases.json').read_text(encoding='utf-8'))
        for case in cases:
            with self.subTest(line=case['line']):
                if case.get('error'):
                    with self.assertRaises(ValueError):
                        parse_line(case['line'])
                else:
                    self.assertEqual(parse_line(case['line']), case['expected'])


if __name__ == '__main__':
    unittest.main()
