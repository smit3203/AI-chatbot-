from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

def test_multitenancy():
    # 1. Login Tenant 1 (Shree Krishna Embroidery, Surat)
    r1 = client.post('/api/auth/login', json={'login_id': '9825012345', 'password': '123456'})
    assert r1.status_code == 200, f'Tenant 1 login failed: {r1.text}'
    t1 = r1.json()
    assert t1['factory']['factory_code'] == 'EMB-1001'
    token1 = t1['token']

    # 2. Get pending lots for Tenant 1
    lots1 = client.get('/api/lots/pending', headers={'Authorization': f'Bearer {token1}'}).json()
    print(f'Tenant 1 (EMB-1001) lots count: {len(lots1)}')
    assert len(lots1) == 4, f'Expected 4 lots for EMB-1001, got {len(lots1)}'

    # 3. Login Tenant 2 (Patel Twist & Embroidery Works, Ahmedabad)
    r2 = client.post('/api/auth/login', json={'login_id': '9898011111', 'password': '123456'})
    assert r2.status_code == 200, f'Tenant 2 login failed: {r2.text}'
    t2 = r2.json()
    assert t2['factory']['factory_code'] == 'EMB-1002'
    token2 = t2['token']

    # 4. Get pending lots for Tenant 2
    lots2 = client.get('/api/lots/pending', headers={'Authorization': f'Bearer {token2}'}).json()
    print(f'Tenant 2 (EMB-1002) lots count: {len(lots2)}')
    assert len(lots2) == 2, f'Expected 2 lots for EMB-1002, got {len(lots2)}'

    # 5. Check demo tenants endpoint
    demos = client.get('/api/auth/demo-tenants').json()
    print(f'Demo tenants available: {len(demos)}')
    assert len(demos) == 2

    # 6. Check ledger with dynamic factory profile for Tenant 1
    parties1 = client.get('/api/parties', headers={'Authorization': f'Bearer {token1}'}).json()
    p1_id = parties1[0]['id']
    ledger1 = client.get(f'/api/ledger/{p1_id}', headers={'Authorization': f'Bearer {token1}'}).json()
    assert 'factory_profile' in ledger1, 'factory_profile missing in ledger'
    fp1 = ledger1['factory_profile']
    assert fp1['factory_name'] == 'Shree Krishna Embroidery'
    print(f'Tenant 1 Branding: {fp1["factory_name"]} | GSTIN: {fp1["gstin"]} | Bank: {fp1["bank_name"]} | UPI: {fp1["upi_id"]}')

    # 7. Check ledger with dynamic factory profile for Tenant 2
    parties2 = client.get('/api/parties', headers={'Authorization': f'Bearer {token2}'}).json()
    p2_id = parties2[0]['id']
    ledger2 = client.get(f'/api/ledger/{p2_id}', headers={'Authorization': f'Bearer {token2}'}).json()
    assert 'factory_profile' in ledger2, 'factory_profile missing in ledger'
    fp2 = ledger2['factory_profile']
    assert fp2['factory_name'] == 'Patel Twist & Embroidery Works'
    print(f'Tenant 2 Branding: {fp2["factory_name"]} | GSTIN: {fp2["gstin"]} | Bank: {fp2["bank_name"]} | UPI: {fp2["upi_id"]}')

    # 8. Test Self-Registration of a 3rd Factory
    reg_payload = {
        'factory_name': 'Maruti Art Embroidery',
        'owner_name': 'Kiritbhai Patel',
        'phone': '9898998877',
        'password': 'secretpassword',
        'city': 'Jetpur',
        'address': 'Plot 7, GIDC, Jetpur',
        'gstin': '24AAAMK5555Z1Z9',
        'bank_name': 'Bank of Baroda',
        'bank_account_no': '12345678901234',
        'bank_ifsc': 'BARB0JETPUR',
        'upi_id': 'marutiart@barodampay',
    }
    r3 = client.post('/api/auth/register', json=reg_payload)
    assert r3.status_code in (200, 201), f'Registration failed: {r3.text}'
    t3 = r3.json()
    assert t3['factory']['factory_code'] == 'EMB-1003'
    assert t3['factory']['subscription_plan'] == 'TRIAL_15_DAYS'
    assert t3['user']['user_code'] == 'USR-1003'
    token3 = t3['token']
    print(f'Tenant 3 Registered: {t3["factory"]["factory_code"]} ({t3["factory"]["factory_name"]}) with token!')

    # 9. Verify Tenant 3 starter demo lot
    lots3 = client.get('/api/lots/pending', headers={'Authorization': f'Bearer {token3}'}).json()
    print(f'Tenant 3 starter lots count: {len(lots3)}')
    assert len(lots3) == 1, 'New tenant with seed_starter_lot=True should have 1 starter lot'
    print(f'Tenant 3 lot 0: {lots3[0]}')
    assert lots3[0]['party_name'] == 'Balaji Textiles (Jetpur)'

    print('\n======================================================')
    print('ALL MULTI-TENANT ISOLATION TESTS PASSED 100% PERFECTLY!')
    print('======================================================')

if __name__ == '__main__':
    test_multitenancy()
