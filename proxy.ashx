<%@ WebHandler Language="C#" Class="proxy" %>

using System;
using System.Web;
using System.IO;
using System.Drawing;
using System.Text;

public class proxy : IHttpHandler 
{
    public void ProcessRequest(HttpContext context)
    {
        string requestType = context.Request["requestType"];

        if (requestType == "getImage")
        {
            string url = context.Request["imageUrl"];
            System.Net.WebRequest request = System.Net.WebRequest.Create(new Uri(url));
            request.Method = context.Request.HttpMethod;
            request.ContentType = "application/x-www-form-urlencoded";

            System.Net.WebResponse response = request.GetResponse();
            Stream stream = response.GetResponseStream();
            Image img = Image.FromStream(stream);

            int index = url.LastIndexOf('/');
            string imageName = url.Remove(0, index + 1);
            string baseDirectory = System.AppDomain.CurrentDomain.BaseDirectory;
            string physicPath = baseDirectory + "\\MapImages\\" + imageName;
            img.Save(physicPath);
            context.Response.Write(imageName);
            context.Response.End();            
        }
        else if (requestType == "getElevation")
        {
            string Rows = context.Request["Rows"];
            string Columns = context.Request["Columns"];
            string xmin = context.Request["xmin"].Trim(); ;
            string ymin = context.Request["ymin"].Trim(); ;
            string xmax = context.Request["xmax"].Trim();
            string ymax = context.Request["ymax"].Trim();
            string wkid = context.Request["wkid"];

            string baseUrl = "http://sampleserver4.arcgisonline.com/ArcGIS/rest/services/Elevation/ESRI_Elevation_World/MapServer/exts/ElevationsSOE/ElevationLayers/1/GetElevationData";
            string paras = "?Extent=%7B%22xmin%22%3A" + xmin + "%2C%0D%0A%22ymin%22%3A" + ymin + "%2C%0D%0A%22xmax%22%3A" + xmax + "%2C%0D%0A%22ymax%22%3A" + ymax + "%2C%0D%0A%22spatialReference%22%3A%7B%22wkid%22%3A" + wkid + "%7D%7D&Rows=" + Rows + "&Columns=" + Columns + "&f=pjson";
            string url = baseUrl + paras;

            System.Net.WebRequest request = System.Net.WebRequest.Create(new Uri(url));
            request.Method = context.Request.HttpMethod;
            request.ContentType = "application/x-www-form-urlencoded";

            System.Net.WebResponse response = request.GetResponse();
            Stream stream = response.GetResponseStream();

            StreamReader sr = new StreamReader(stream);
            string strResponse = sr.ReadToEnd();
            int index1 = strResponse.LastIndexOf('[') + 1;
            string str = strResponse.Remove(0, index1);
            int index2 = str.LastIndexOf(']');
            string result = str.Remove(index2);
            result = result.Replace("\r\n", "").Replace(" ", "");//类似于这样32767,32767,-3175,384,1983,-208

            //假设高程6500对应着地球投影面长宽的1/10
            float width = int.Parse(Rows);
            string[] results = result.Split(',');

            StringBuilder LastOutput = new StringBuilder();
            LastOutput.Append(Rows + ";" + Columns + ";");

            for (int i = 0; i < results.Length; i++)
            {
                string strElevation = results[i];
                int Elevation = int.Parse(strElevation);

                if (Elevation == 32767)
                {
                    Elevation = 0;
                }

                float handledElevation = width / 10 * Elevation / 6500;

                string strHandledElevation = handledElevation.ToString();

                if (i != results.Length - 1)
                {
                    LastOutput.Append(strHandledElevation + ",");
                }
                else
                {
                    LastOutput.Append(strHandledElevation);
                }
            }

            context.Response.ContentType = "text/plain";
            context.Response.Write(LastOutput.ToString());
            context.Response.End();
        }
    }
 
    public bool IsReusable 
    {
        get {
            return false;
        }
    }
}