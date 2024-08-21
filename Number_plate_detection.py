import urllib.parse
import gridfs
import serial
import time
import cv2
import easyocr
from pymongo import MongoClient
import datetime
import numpy as np
import requests
import pyttsx3
import json
import pytesseract
engine = pyttsx3.init()

import requests

import requests










# ser=serial.Serial(port="com3",baudrate=9600)




client=MongoClient('mongodb://127.0.0.1:27017/')
db=client.get_database('parking')
records = db['entries']

reader=easyocr.Reader(['en'])
frameWidth = 640    #Frame Width
franeHeight = 480   # Frame Height

plateCascade = cv2.CascadeClassifier("C:/Users/91955/Downloads/EDI Smart Car Parking System/haarcascade_russian_plate_number.xml")
minArea = 500

cap =cv2.VideoCapture(0)
cap.set(3,frameWidth)
cap.set(4,franeHeight)
cap.set(10,150)
count = 0

while True:
    success , img  = cap.read()

    imgGray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

    numberPlates = plateCascade .detectMultiScale(imgGray, 1.1, 4)

    for (x, y, w, h) in numberPlates:
        area = w*h
        if area > minArea:
            cv2.rectangle(img, (x, y), (x + w, y + h), (255, 0, 0), 2)
            cv2.putText(img,"NumberPlate",(x,y-5),cv2.FONT_HERSHEY_COMPLEX,1,(0,0,255),2)
            imgRoi = img[y:y+h,x:x+w]
            cv2.imshow("ROI",imgRoi)
    cv2.imshow("Result",img)
    if cv2.waitKey(1) & 0xFF ==ord('s'):
        cv2.imwrite("capture.jpg",imgRoi)
        cv2.rectangle(img,(0,200),(640,300),(0,255,0),cv2.FILLED)
        cv2.putText(img,"Scan Saved",(15,265),cv2.FONT_HERSHEY_COMPLEX,2,(0,0,255),2)
        cv2.imshow("Result",img)
        break;
        cap.release()
        cv2.destroyAllWindows()
results = reader.readtext('capture.jpg')
text = ''
i = 0
for result in results:
    text += result[1] + ' '

current_time = datetime.datetime.now()
number = ""
for t in text:
    if (t != " "):
        if i == 3 and t == 'Z':
            number += '2'
        else:
            number += t;
            i += 1
print(number)



isAvailable = records.find_one({'Number': number})
if(isAvailable):
    cap.release()
    cv2.destroyAllWindows()
    print(isAvailable)
    parkingTime = isAvailable["time"]
    owner = isAvailable["Owner"]
    print(owner)

    sec = (current_time - parkingTime).seconds
    hours = (sec / (60 * 60))
    i = 0
    print('difference in hours:', hours)
    firstname = ''
    surname = ''
    for j in owner:
        if (j == ' '):
            i += 1
        if (i == 2 and j != ' '):
            surname += j
        if (i == 0):
            firstname += j
    print(firstname)
    print(surname)
    url2 = f"https://gender-api.com/get?name={firstname}&key=YOUR_KEY"
    response = requests.request("GET", url2)
    res = json.loads(response.text)
    gender = res["gender"]

    if gender == "male":

        # ser.write(bytes(f"{surname} Sir,", 'utf-8'))
        time.sleep(3)
        engine.say(f"{surname} Sir")
        engine.runAndWait()
    else:

        # ser.write(bytes(f"{surname} Ma'am,", 'utf-8'))
        time.sleep(3)
        engine.say(f"{surname} Ma'am")
        engine.runAndWait()
    fees=int(hours*100)
    print(fees)

    print(f"Please pay {int(hours * 100)}rs")
    msg = f"Please Pay {int(hours * 100)}rupees"
    engine.say(msg)
    engine.runAndWait()
    data = {'amount': fees, 'contact': isAvailable['mobile_number'], 'name': isAvailable['Owner']}
    requests.post(url='http://localhost:3000/create_transaction', data=data)
    # # ser.write(bytes(f"Please pay {int(hours * 100)}rs", 'utf-8'))
    # time.sleep(10)
    # msg = "Visit Again!"
    # # ser.write(bytes(msg, 'utf-8'));
    # time.sleep(10)
    # msg = "ParkExpert"
    # # ser.write(bytes(msg, 'utf-8'))

    cv2.waitKey(500)
    count += 1


else:
    bookings=db['bookings']
    isBooked=bookings.find_one({'number_plate':number})

    if(isBooked):
        print(isBooked)
        filter = {'number_plate':number}
        update = {"$set": {"isParked":True}}
        bookings.update_one(filter, update)
        url = "https://vehicle-rc-information.p.rapidapi.com/"

        payload = {"VehicleNumber": number.upper()}
        headers = {
            "content-type": "application/json",
            "X-RapidAPI-Key": "YOUR_KEY",
            "X-RapidAPI-Host": "vehicle-rc-information.p.rapidapi.com"
        }
        response = requests.request("POST", url, json=payload, headers=headers)
        print(response.text)
        response = res = json.loads(response.text)['result']
        print("Address: ", response['current_address'])
        print("Color: ", response['colour'])
        print("Name: ", response['owner_name'])
        print("Mobile Number: ", response['owner_mobile_no'])
        print("Vehicle Model: ", response['manufacturer_model'])
        owner =  response['owner_name']
        vehicle_name = response['manufacturer_model']
        address = response['current_address']
        color=response['colour']
        if response['owner_mobile_no']:
            mobile_number=response['owner_mobile_no']
        else:
            mobile_number='None'
        rec = {
            'time': current_time,
            'Number': number,
            'Owner':owner,
            'Vehicle':vehicle_name,
            'address':address,
            'color':color,
            'mobile_number':mobile_number
        }
        records.insert_one(rec)
        i=0;
        firstname=''
        surname=''
        for j in owner:
            if (j == ' '):
                i += 1
            if (i == 2 and j != ' '):
                surname += j
            if (i == 0):
                firstname += j
        url2 = f"https://gender-api.com/get?name={firstname}&key=YOUR_KEY"
        response = requests.request("GET", url2)
        res = json.loads(response.text)
        gender = res["gender"]

        if gender == "male":
            engine.say(f"Welcome {surname} Sir to ParkExpert")
            engine.runAndWait()
        else:
            engine.say(f"Welcome {surname} Ma'am to ParkExpert")
    #     engine.runAndWait()
    else:
        print("You haven't done booking")
        # get difference in hours






