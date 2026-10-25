import os
from datetime import date, datetime, timezone
from uuid import uuid4
from sqlmodel import Session, select
from database import engine, init_db
from models import (
    Party, Challan, ChallanType, UnitType, LotDelivery,
    MachineShift, ShiftType, RateQuote, MaterialType
)

def seed_database():
    """Seeds realistic Gujarat embroidery job-work test data."""
    init_db()
    with Session(engine) as session:
        # Check if already seeded
        existing_parties = session.exec(select(Party)).first()
        if existing_parties:
            print("[Seed Info] Database already contains records. Clearing and reseeding fresh data...")
            session.exec(select(LotDelivery)).all()
            for obj in session.exec(select(LotDelivery)).all():
                session.delete(obj)
            for obj in session.exec(select(Challan)).all():
                session.delete(obj)
            for obj in session.exec(select(MachineShift)).all():
                session.delete(obj)
            for obj in session.exec(select(RateQuote)).all():
                session.delete(obj)
            for obj in session.exec(select(Party)).all():
                session.delete(obj)
            session.commit()

        print("[Seed Engine] Seeding Gujarat EmbroideryOS v2.0 master dataset...")

        # 1. PARTIES
        party_radhe = Party(
            name="Radhe Creation (સુરત)",
            phone="+91 98250 12345",
            city="Surat"
        )
        party_maruti = Party(
            name="Maruti Embroidery (અમદાવાદ)",
            phone="+91 98980 67890",
            city="Ahmedabad"
        )
        party_shivam = Party(
            name="Shivam Textiles (જેતપુર)",
            phone="+91 97123 45678",
            city="Jetpur"
        )
        party_khodiyar = Party(
            name="Khodiyar Fashion (સુરત)",
            phone="+91 94260 54321",
            city="Surat"
        )

        session.add_all([party_radhe, party_maruti, party_shivam, party_khodiyar])
        session.commit()
        session.refresh(party_radhe)
        session.refresh(party_maruti)
        session.refresh(party_shivam)
        session.refresh(party_khodiyar)

        # 2. INWARD CHALLANS (LOTS)
        inward_radhe = Challan(
            challan_type=ChallanType.INWARD,
            party_id=party_radhe.id,
            challan_number="RC-1048",
            challan_date=date(2026, 10, 24),
            design_number="D-1024",
            factory_punch_number="SK-45",
            agreed_rate=42.0,
            stitches_per_piece=28000,
            fabric_type="Fox Georgette",
            total_quantity=1200.0,
            unit=UnitType.PCS,
            photo_url="/uploads/preset_radhe_inward.jpg",
            notes="ગળા-દામન વર્ક, ૧૨૦૦ નંગ કટ પીસ, પંચિંગ SK-45, ભાવ ₹૪૨/પીસ"
        )

        inward_maruti = Challan(
            challan_type=ChallanType.INWARD,
            party_id=party_maruti.id,
            challan_number="ME-802",
            challan_date=date(2026, 10, 23),
            design_number="D-402",
            factory_punch_number="MR-12",
            agreed_rate=35.0,
            stitches_per_piece=22000,
            fabric_type="Pure Silk",
            total_quantity=800.0,
            unit=UnitType.PCS,
            photo_url="/uploads/preset_maruti_outward.jpg",
            notes="૮૦૦ પીસ સિલ્ક કુર્તી ફ્રન્ટ વર્ક, પંચિંગ MR-12, ભાવ ₹૩૫/પીસ"
        )

        inward_shivam = Challan(
            challan_type=ChallanType.INWARD,
            party_id=party_shivam.id,
            challan_number="ST-5501",
            challan_date=date(2026, 10, 22),
            design_number="D-8820",
            factory_punch_number="SH-09",
            agreed_rate=18.5,
            stitches_per_piece=14000,
            fabric_type="Rayon 14kg",
            total_quantity=3500.0,
            unit=UnitType.MTR,
            notes="૩૫૦૦ મીટર આખા તાકા, મલ્ટી કોર્ડિંગ વર્ક"
        )

        inward_khodiyar = Challan(
            challan_type=ChallanType.INWARD,
            party_id=party_khodiyar.id,
            challan_number="KF-309",
            challan_date=date(2026, 10, 21),
            design_number="D-701",
            factory_punch_number="KF-77",
            agreed_rate=55.0,
            stitches_per_piece=34000,
            fabric_type="Organza Tissue",
            total_quantity=600.0,
            unit=UnitType.PCS,
            notes="૬૦૦ પીસ ઓર્ગેન્ઝા દુપટ્ટા બોર્ડર, ભાવ ₹૫૫/પીસ"
        )

        session.add_all([inward_radhe, inward_maruti, inward_shivam, inward_khodiyar])
        session.commit()
        session.refresh(inward_radhe)
        session.refresh(inward_maruti)
        session.refresh(inward_shivam)
        session.refresh(inward_khodiyar)

        # 3. OUTWARD CHALLANS & TRANCHE LOT DELIVERIES
        # Batch 1 for Radhe: 400 Fresh + 50 Returned Raw + 20 Kasar + 10 Fent
        outward_radhe_1 = Challan(
            challan_type=ChallanType.OUTWARD,
            party_id=party_radhe.id,
            challan_number="JW-405",
            challan_date=date(2026, 10, 24),
            design_number="D-1024",
            factory_punch_number="SK-45",
            agreed_rate=42.0,
            stitches_per_piece=28000,
            fabric_type="Fox Georgette",
            total_quantity=400.0,
            unit=UnitType.PCS,
            photo_url="/uploads/outward_jw_405.jpg",
            notes="જાવક: ૪૦૦ પીસ ફ્રેશ, ૫૦ પીસ કાચો પરત, ૨૦ પીસ કાસર, ૧૦ પીસ ફેંટ"
        )
        session.add(outward_radhe_1)
        session.commit()
        session.refresh(outward_radhe_1)

        delivery_radhe_1 = LotDelivery(
            inward_challan_id=inward_radhe.id,
            outward_challan_id=outward_radhe_1.id,
            fresh_quantity=400.0,
            returned_raw_quantity=50.0,
            kasar_quantity=20.0,
            fent_quantity=10.0,
            dispatch_date=date(2026, 10, 24)
        )

        # Batch 1 for Maruti: 500 Fresh + 25 Kasar
        outward_maruti_1 = Challan(
            challan_type=ChallanType.OUTWARD,
            party_id=party_maruti.id,
            challan_number="JW-401",
            challan_date=date(2026, 10, 23),
            design_number="D-402",
            factory_punch_number="MR-12",
            agreed_rate=35.0,
            stitches_per_piece=22000,
            fabric_type="Pure Silk",
            total_quantity=500.0,
            unit=UnitType.PCS,
            notes="૫૦૦ પીસ ફ્રેશ જાવક અને ૨૫ પીસ કાસર"
        )
        session.add(outward_maruti_1)
        session.commit()
        session.refresh(outward_maruti_1)

        delivery_maruti_1 = LotDelivery(
            inward_challan_id=inward_maruti.id,
            outward_challan_id=outward_maruti_1.id,
            fresh_quantity=500.0,
            returned_raw_quantity=0.0,
            kasar_quantity=25.0,
            fent_quantity=0.0,
            dispatch_date=date(2026, 10, 23)
        )

        # Batch 1 for Shivam: 1500 Fresh Mtr + 50 Kasar + 30 Fent
        outward_shivam_1 = Challan(
            challan_type=ChallanType.OUTWARD,
            party_id=party_shivam.id,
            challan_number="JW-398",
            challan_date=date(2026, 10, 23),
            design_number="D-8820",
            factory_punch_number="SH-09",
            agreed_rate=18.5,
            stitches_per_piece=14000,
            fabric_type="Rayon 14kg",
            total_quantity=1500.0,
            unit=UnitType.MTR,
            notes="૧૫૦૦ મીટર ફ્રેશ અને ૫૦ મીટર કાસર"
        )
        session.add(outward_shivam_1)
        session.commit()
        session.refresh(outward_shivam_1)

        delivery_shivam_1 = LotDelivery(
            inward_challan_id=inward_shivam.id,
            outward_challan_id=outward_shivam_1.id,
            fresh_quantity=1500.0,
            returned_raw_quantity=0.0,
            kasar_quantity=50.0,
            fent_quantity=30.0,
            dispatch_date=date(2026, 10, 23)
        )

        session.add_all([delivery_radhe_1, delivery_maruti_1, delivery_shivam_1])
        session.commit()

        # 4. MACHINE SHIFTS (DAY / NIGHT WITH PERSISTED BONUSES & ALERTS)
        shift_1 = MachineShift(
            machine_number="M-01",
            shift_type=ShiftType.DAY,
            shift_date=date(2026, 10, 24),
            operator_name="Ramesh Karigar",
            start_stitch_counter=14200000,
            end_stitch_counter=14645000,
            total_stitches=445000,
            target_stitches=400000,
            efficiency_pct=111.25,
            bonus_earned_inr=67.50,
            is_low_efficiency_alert=False,
            rpm_average=680,
            downtime_minutes=25,
            photo_url="/uploads/preset_dahao_lcd.jpg",
            notes="દિવસ શિફ્ટ: ઉત્કૃષ્ટ ઉત્પાદન, ૪૫,૦૦૦ વધારાના ટાંકા"
        )

        shift_2 = MachineShift(
            machine_number="M-01",
            shift_type=ShiftType.NIGHT,
            shift_date=date(2026, 10, 24),
            operator_name="Mukesh Karigar",
            start_stitch_counter=14645000,
            end_stitch_counter=15010000,
            total_stitches=365000,
            target_stitches=400000,
            efficiency_pct=91.25,
            bonus_earned_inr=0.0,
            is_low_efficiency_alert=False,
            rpm_average=640,
            downtime_minutes=45,
            notes="રાત્રિ શિફ્ટ: સામાન્ય ઉત્પાદન, દોરો તૂટવાની સામાન્ય સમસ્યા"
        )

        shift_3 = MachineShift(
            machine_number="M-02",
            shift_type=ShiftType.DAY,
            shift_date=date(2026, 10, 24),
            operator_name="Dinesh Karigar",
            start_stitch_counter=8500000,
            end_stitch_counter=8760000,
            total_stitches=260000,
            target_stitches=400000,
            efficiency_pct=65.0,
            bonus_earned_inr=0.0,
            is_low_efficiency_alert=True,  # Low efficiency alert flagged!
            rpm_average=580,
            downtime_minutes=110,  # > 90 mins downtime!
            notes="ચેતવણી: ૧૧૦ મિનિટ ડાઉનટાઇમ (લાઈટ ગઈ અને બોબિન કેસ જામ)"
        )

        shift_4 = MachineShift(
            machine_number="M-02",
            shift_type=ShiftType.NIGHT,
            shift_date=date(2026, 10, 24),
            operator_name="Suresh Karigar",
            start_stitch_counter=8760000,
            end_stitch_counter=9180000,
            total_stitches=420000,
            target_stitches=400000,
            efficiency_pct=105.0,
            bonus_earned_inr=30.0,
            is_low_efficiency_alert=False,
            rpm_average=670,
            downtime_minutes=30,
            notes="રાત્રિ શિફ્ટ: ૨૦,૦૦૦ વધારાના ટાંકા બોનસ ₹૩૦"
        )

        session.add_all([shift_1, shift_2, shift_3, shift_4])

        # 5. RATE QUOTES
        quote_1 = RateQuote(
            party_id=party_radhe.id,
            design_number="D-1024",
            stitch_count=28000,
            machine_heads=20,
            material_type=MaterialType.JARI_THREAD,
            cost_per_piece=16.73,
            quoted_rate=20.91,
            profit_margin_pct=25.0
        )
        quote_2 = RateQuote(
            party_id=party_maruti.id,
            design_number="D-402",
            stitch_count=22000,
            machine_heads=20,
            material_type=MaterialType.THREAD_ONLY,
            cost_per_piece=13.80,
            quoted_rate=17.25,
            profit_margin_pct=25.0
        )

        session.add_all([quote_1, quote_2])
        session.commit()

        print("[Seed Engine] Seeding complete! 4 Parties, 4 Inward Lots, 3 Outward Dispatches, 4 Machine Shifts created.")

if __name__ == "__main__":
    seed_database()
